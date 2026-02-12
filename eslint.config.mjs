import recommended from '@bangbang93/eslint-config-recommended'

export default [
  ...recommended,
  {
    ignores: [
      '**/*.js',
      '**/*.d.ts',
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'config.d/**',
      'config/**',
      'eslint.config.mjs',
      'jest.config.js',
    ],
  },
  {
    files: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
]
