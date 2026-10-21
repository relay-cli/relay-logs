import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'eslint.config.js',
      'examples/**/*.mjs',
      'tests/fixtures/**',
    ],
  },
  {
    languageOptions: {
      parserOptions: {projectService: true, tsconfigRootDir: import.meta.dirname},
    },
    rules: {
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/restrict-template-expressions': ['error', {allowNumber: true}],
    },
  },
);
