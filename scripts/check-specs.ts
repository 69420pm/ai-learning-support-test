import fs from 'node:fs';
import path from 'node:path';

const SPECS_DIR = path.resolve(process.cwd(), 'specs');
const PLANS_DIR = path.join(SPECS_DIR, 'plans');
const ADRS_DIR = path.join(SPECS_DIR, 'adrs');
const EPICS_DIR = path.join(SPECS_DIR, 'epics');
const PLAN_INDEX_FILE = path.join(SPECS_DIR, 'plan-index.md');
const ADR_INDEX_FILE = path.join(SPECS_DIR, 'adr-index.md');

type CheckResult = {
  category: string;
  item: string;
  status: 'ok' | 'missing' | 'warning';
  message: string;
};

const results: CheckResult[] = [];

// 1. Check Plans Indexing
if (fs.existsSync(PLANS_DIR) && fs.existsSync(PLAN_INDEX_FILE)) {
  const planIndexContent = fs.readFileSync(PLAN_INDEX_FILE, 'utf-8');
  const planFiles = fs.readdirSync(PLANS_DIR).filter((f) => f.endsWith('.md'));

  for (const file of planFiles) {
    const relativePlanPath = `plans/${file}`;
    if (!planIndexContent.includes(relativePlanPath) && !planIndexContent.includes(file)) {
      results.push({
        category: 'Plans Index',
        item: file,
        status: 'missing',
        message: `Plan file '${file}' is not indexed in specs/plan-index.md`,
      });
    } else {
      results.push({
        category: 'Plans Index',
        item: file,
        status: 'ok',
        message: 'Indexed correctly',
      });
    }
  }
}

// 2. Check ADRs Indexing
if (fs.existsSync(ADRS_DIR) && fs.existsSync(ADR_INDEX_FILE)) {
  const adrIndexContent = fs.readFileSync(ADR_INDEX_FILE, 'utf-8');
  const adrFiles = fs.readdirSync(ADRS_DIR).filter((f) => f.endsWith('.md'));

  for (const file of adrFiles) {
    const relativeAdrPath = `adrs/${file}`;
    if (!adrIndexContent.includes(relativeAdrPath) && !adrIndexContent.includes(file)) {
      results.push({
        category: 'ADRs Index',
        item: file,
        status: 'missing',
        message: `ADR file '${file}' is not indexed in specs/adr-index.md`,
      });
    } else {
      results.push({
        category: 'ADRs Index',
        item: file,
        status: 'ok',
        message: 'Indexed correctly',
      });
    }
  }
}

// 3. Check Epics Indexing
if (fs.existsSync(EPICS_DIR) && fs.existsSync(PLAN_INDEX_FILE)) {
  const planIndexContent = fs.readFileSync(PLAN_INDEX_FILE, 'utf-8');
  const epicFiles = fs.readdirSync(EPICS_DIR).filter((f) => f.endsWith('.md'));

  for (const file of epicFiles) {
    const relativeEpicPath = `epics/${file}`;
    if (!planIndexContent.includes(relativeEpicPath) && !planIndexContent.includes(file)) {
      results.push({
        category: 'Epics Index',
        item: file,
        status: 'missing',
        message: `Epic file '${file}' is not indexed in specs/plan-index.md`,
      });
    } else {
      results.push({
        category: 'Epics Index',
        item: file,
        status: 'ok',
        message: 'Indexed correctly',
      });
    }
  }
}

// 3. Print Results Summary
console.log('\n📋 --- Spec & Documentation Synchronization Report ---');
const missing = results.filter((r) => r.status === 'missing');
const ok = results.filter((r) => r.status === 'ok');

console.log(`✅ Indexed items: ${ok.length}`);
if (missing.length > 0) {
  console.error(`❌ Unindexed / Missing items: ${missing.length}`);
  for (const m of missing) {
    console.error(`  - [${m.category}] ${m.message}`);
  }
  process.exit(1);
} else {
  console.log('🎉 All specs, ADRs, and plans are 100% synchronized!\n');
}
