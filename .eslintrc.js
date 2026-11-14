// =============================================================================
// ESLINT — Plantilla Microservicio
// Mismas reglas que plantilla-base, adaptadas al layout de monorepo
// (packages/shared + services/*). Ver docs/conventions.md.
// =============================================================================

// ESLint corre sin .env cargado: no importar config de la app acá.
const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  root: true,
  ignorePatterns: ['**/node_modules/**', '**/coverage/**', '**/migrations/**', '**/seeders/**', '**/scripts/**', '.eslintrc.js'],

  env: {
    node: true,
    es2022: true,
    jest: true
  },

  extends: ['eslint:recommended', 'prettier'],

  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'script'
  },

  plugins: ['filenames-simple'],

  rules: {
    // ── Nombres ──────────────────────────────────────────────────────────────
    camelcase: ['error', { properties: 'never', ignoreDestructuring: true, ignoreImports: false, ignoreGlobals: false }],
    'id-match': [
      'error',
      '^(_?[a-z][a-zA-Z0-9]*|[A-Z][A-Z0-9_]*|[A-Z][a-zA-Z0-9]*|_[a-z][a-zA-Z0-9]*|\\$[a-zA-Z0-9]*)$',
      { properties: false, onlyDeclarations: true, ignoreDestructuring: true }
    ],
    'filenames-simple/naming-convention': ['error', { rule: 'kebab-case' }],

    // ── Variables ────────────────────────────────────────────────────────────
    'no-var': 'error',
    'prefer-const': 'error',
    'no-unused-vars': [
      'error',
      { vars: 'all', args: 'after-used', argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }
    ],
    'no-shadow': ['error', { builtinGlobals: false, hoist: 'functions', allow: ['error', 'resolve', 'reject', 'next'] }],
    'no-use-before-define': ['error', { functions: false, classes: true, variables: true }],

    // ── Async ────────────────────────────────────────────────────────────────
    'require-await': 'error',
    'no-return-await': 'error',
    'no-promise-executor-return': 'error',

    // ── Estilo / calidad ─────────────────────────────────────────────────────
    'prefer-arrow-callback': ['error', { allowNamedFunctions: false, allowUnboundThis: true }],
    'no-constructor-return': 'error',
    'max-lines-per-function': ['warn', { max: 90, skipBlankLines: true, skipComments: true, IIFEs: false }],
    'max-len': [
      'error',
      { code: 130, ignoreUrls: true, ignoreStrings: false, ignoreTemplateLiterals: true, ignoreRegExpLiterals: true }
    ],
    'prefer-template': 'error',
    'prefer-destructuring': ['warn', { VariableDeclarator: { array: false, object: true }, AssignmentExpression: { array: false, object: false } }],
    curly: ['error', 'all'],
    eqeqeq: ['error', 'always', { null: 'ignore' }],
    'no-else-return': ['error', { allowElseIf: false }],
    'consistent-return': 'error',
    'prefer-spread': 'error',
    'prefer-rest-params': 'error',
    'no-console': isProduction ? 'error' : 'warn',
    'no-throw-literal': 'error',
    'no-param-reassign': ['error', { props: false }],
    'no-unused-expressions': ['error', { allowShortCircuit: true, allowTernary: true, allowTaggedTemplates: false }],

    // ── Configuración: process.env solo en los archivos de config ───────────
    'no-process-env': 'error',

    // ── Seguridad ────────────────────────────────────────────────────────────
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-proto': 'error',
    'no-constant-condition': ['error', { checkLoops: false }],
    'no-duplicate-imports': 'error',
    'no-new': 'error'
  },

  overrides: [
    {
      files: ['**/*.test.js', '**/tests/**/*.js'],
      rules: {
        'max-lines-per-function': 'off',
        'max-len': 'off',
        'no-unused-expressions': 'off',
        'no-console': 'off',
        'id-match': 'off',
        'no-process-env': 'off',
        'require-await': 'off'
      }
    },
    {
      // Únicos lugares donde se lee process.env (fail-fast centralizado)
      files: ['**/config/**/*.js', '**/shared/src/config/**/*.js'],
      rules: { 'no-process-env': 'off', 'no-console': 'off' }
    },
    {
      files: ['**/models/**/*.js'],
      rules: { 'max-lines-per-function': 'off', 'max-len': 'off' }
    },
    {
      // jest.config.js / babel.config.js no siguen kebab-case con sufijo de capa
      files: ['**/jest.config.js'],
      rules: { 'filenames-simple/naming-convention': 'off' }
    }
  ]
};
