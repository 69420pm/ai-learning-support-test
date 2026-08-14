/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular dependencies create tight coupling and memory leaks.',
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: 'components-cannot-import-db',
      severity: 'error',
      comment:
        'Presentation components in components/ MUST NOT import directly from lib/db or raw database clients.',
      from: {
        path: '^components/',
      },
      to: {
        path: '^lib/db',
      },
    },
    {
      name: 'domain-cannot-import-presentation',
      severity: 'error',
      comment: 'Domain modules in lib/ MUST NOT import from app/ or components/.',
      from: {
        path: '^lib/',
      },
      to: {
        path: '^(app|components)/',
      },
    },
    {
      name: 'no-raw-db-in-api-routes',
      severity: 'error',
      comment:
        'API routes in app/api/ must not import raw database connection packages (pg, postgres). Use @/lib/db instead.',
      from: {
        path: '^app/api/',
      },
      to: {
        path: '^(pg|postgres|drizzle-orm/postgres-js)$',
      },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json',
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
      extensions: ['.ts', '.tsx', '.d.ts', '.js', '.jsx'],
    },
  },
};
