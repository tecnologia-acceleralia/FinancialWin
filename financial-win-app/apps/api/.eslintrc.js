module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier',
  ],
  plugins: ['@typescript-eslint', 'prettier', 'unused-imports'],
  globals: {
    console: 'readonly',
    process: 'readonly',
    Buffer: 'readonly',
    __dirname: 'readonly',
    __filename: 'readonly',
    global: 'readonly',
    setTimeout: 'readonly',
    clearTimeout: 'readonly',
    setInterval: 'readonly',
    clearInterval: 'readonly',
    setImmediate: 'readonly',
    clearImmediate: 'readonly',
    fetch: 'readonly',
    Express: 'readonly',
  },
  rules: {
    // === ERRORES CRÍTICOS ===
    'no-redeclare': 'error',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      },
    ],
    'unused-imports/no-unused-imports': 'error',
    // Reglas críticas para promesas (evitan bugs comunes con async/await)
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/no-misused-promises': 'error',

    // === WARNINGS IMPORTANTES ===
    // Reglas de seguridad TypeScript
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unsafe-assignment': 'warn',
    '@typescript-eslint/no-unsafe-member-access': 'warn',
    '@typescript-eslint/no-unsafe-call': 'warn',
    '@typescript-eslint/no-unsafe-return': 'warn',
    // Reglas de mejores prácticas
    '@typescript-eslint/prefer-nullish-coalescing': 'warn',
    '@typescript-eslint/prefer-optional-chain': 'warn',
    '@typescript-eslint/require-await': 'warn',
    '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
    '@typescript-eslint/prefer-as-const': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    // Reglas de tipos explícitos (mejoran mantenibilidad)
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'warn',
    '@typescript-eslint/no-empty-function': [
      'warn',
      { allow: ['constructors'] },
    ],

    // === CONFIGURACIÓN PRETTIER ===
    'prettier/prettier': ['error', { endOfLine: 'auto' }],
    'no-useless-escape': 'off', // Turn off to avoid conflicts with TypeScript

    // === DESACTIVADAS (legacy/compatibilidad) ===
    '@typescript-eslint/interface-name-prefix': 'off',
    'unused-imports/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    // Reglas que requieren strictNullChecks (ya habilitado en tsconfig.json)
    // Deshabilitadas para evitar advertencias falsas por cache del IDE
    '@typescript-eslint/restrict-plus-operands': 'off',
    '@typescript-eslint/restrict-financial-win-expressions': 'off',
    '@typescript-eslint/no-base-to-string': 'off',
  },
  overrides: [
    // Relajar en scripts/migrations/tests
    {
      files: [
        'src/migrations/**/*.ts',
        'src/scripts/**/*.ts',
        'src/**/__tests__/**/*.ts',
        'src/**/?(*.)spec.ts',
        'src/**/?(*.)test.ts',
        '**/*.spec.ts',
        '**/*.test.ts',
        'test/**/*.ts',
      ],
      rules: {
        // Relajar reglas estrictas en tests
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-floating-promises': 'off',
        '@typescript-eslint/no-misused-promises': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-unused-vars': [
          'warn',
          { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
        ],
      },
    },
  ],
  ignorePatterns: ['dist/**', 'node_modules/**', '.eslintrc.js', 'data-source.cjs'],
};

