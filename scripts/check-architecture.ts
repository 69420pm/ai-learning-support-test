import fs from 'node:fs';
import path from 'node:path';

const SRC_DIRS = ['app', 'components', 'lib'];
const ROOT_DIR = process.cwd();

type Violation = {
  rule: string;
  file: string;
  line: number;
  importPath: string;
  message: string;
};

const violations: Violation[] = [];

function checkComponentRules(file: string, line: number, importPath: string) {
  if (
    file.startsWith('components/') &&
    (importPath.startsWith('@/lib/db') || importPath.includes('/lib/db'))
  ) {
    violations.push({
      rule: 'components-cannot-import-db',
      file,
      line,
      importPath,
      message:
        'Presentation component imports database client/schema directly. Delegate via API or server actions.',
    });
  }
}

function checkApiRules(file: string, line: number, importPath: string) {
  const isRawDb =
    importPath === 'pg' ||
    importPath === 'postgres' ||
    importPath.startsWith('drizzle-orm/postgres-js');
  if (file.startsWith('app/api/') && isRawDb) {
    violations.push({
      rule: 'no-raw-db-in-api',
      file,
      line,
      importPath,
      message: 'API route imports raw database driver directly. Use @/lib/db queries instead.',
    });
  }
}

function checkDomainRules(file: string, line: number, importPath: string) {
  const isPresentation = importPath.startsWith('@/app') || importPath.startsWith('@/components');
  if (file.startsWith('lib/') && !file.includes('.test.') && isPresentation) {
    violations.push({
      rule: 'domain-cannot-import-presentation',
      file,
      line,
      importPath,
      message: 'Domain module in lib/ imports presentation components/routes.',
    });
  }
}

function checkPathAliasRules(file: string, line: number, importPath: string) {
  if (importPath.startsWith('../../') && !file.startsWith('tests/')) {
    violations.push({
      rule: 'no-relative-backtracking',
      file,
      line,
      importPath,
      message:
        'Use path alias (@/lib, @/components, @/app) instead of relative backtracking (../../).',
    });
  }
}

function scanFile(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const relativeFile = path.relative(ROOT_DIR, filePath);

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const match = lines[i].match(/(?:import|from)\s+['"]([^'"]+)['"]/);
    if (!match) continue;

    const importPath = match[1];
    checkComponentRules(relativeFile, lineNum, importPath);
    checkApiRules(relativeFile, lineNum, importPath);
    checkDomainRules(relativeFile, lineNum, importPath);
    checkPathAliasRules(relativeFile, lineNum, importPath);
  }
}

function walkDir(dir: string) {
  const fullPath = path.join(ROOT_DIR, dir);
  if (!fs.existsSync(fullPath)) return;

  const entries = fs.readdirSync(fullPath, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(fullPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next') {
        walkDir(path.join(dir, entry.name));
      }
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      scanFile(entryPath);
    }
  }
}

for (const dir of SRC_DIRS) {
  walkDir(dir);
}

console.log('\n🏛️  --- Architectural Boundary Report ---');
if (violations.length === 0) {
  console.log(
    '🎉 0 architectural violations found! All layer boundaries conform to single-app architecture.\n',
  );
} else {
  console.error(`❌ Found ${violations.length} architectural violation(s):`);
  for (const v of violations) {
    console.error(`  - [${v.rule}] ${v.file}:${v.line} -> "${v.importPath}": ${v.message}`);
  }
  process.exit(1);
}
