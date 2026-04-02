// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import unusedImports from 'eslint-plugin-unused-imports';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  // Global ignores
  {
    ignores: ['node_modules/**', 'dist/**', 'build/**', 'coverage/**', 'functions/**', 'public/assets/**'],
  },

  // Base JS rules
  js.configs.recommended,

  // TypeScript rules (parser + plugin)
  ...tseslint.configs.recommended,

  // Your project rules — IMPORTANT: explicitly include src/*
  {
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      // If you use browser globals (window, document), enable them:
      globals: { window: 'readonly', document: 'readonly' },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
      'unused-imports': unusedImports,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // Formatting consistency
      indent: ['error', 2, { SwitchCase: 1 }],
      'no-tabs': 'error',
      'react/jsx-indent': ['error', 2],
      'react/jsx-indent-props': ['error', 2],

      // React/TS defaults that play nicely together
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',

      // Hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-restricted-globals': ['error', {
        name: 'location',
        message: 'Use useLocation() from react-router-dom instead of global location in React components.',
      }],
      '@typescript-eslint/no-explicit-any': 'off', // Allow 'any' for flexibility, but consider enabling with exceptions later
      'no-useless-catch': 'warn',


      // Auto-remove unused imports / vars
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      // We let unused-imports handle this
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
];
