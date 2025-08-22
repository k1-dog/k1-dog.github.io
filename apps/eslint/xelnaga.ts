import * as tsParser from '@typescript-eslint/parser'
import xelnagaPlugin from './rules'
// import type { Linter } from 'eslint' -> Linter.Config

// "main": "xelnaga.ts",
// "exports": {
//   ".": "./xelnaga.ts",
//   "./rules": {
//     "import": "./rules/index.ts",
//     "require": "./rules/index.cjs"
//   }
// },
const xelnagaWorldPath: string = __dirname
const myXelnaga = [
  // eslintConfig.configs.recommended,
  // {
  //   env: { node: true }
  // },
  {
    plugins: {
      '@xelnaga': xelnagaPlugin
    },
    rules: {
      'semi': 'off',
      'no-trailing-spaces': ['warn'],
      '@xelnaga/name-defined': ['warn']
    }
  },
  {
    files: ['**/*.{ts,tsx}']
  },
  {
    languageOptions: {
      // globals: { node: true },
      parser: tsParser,
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 'latest',
        // project: './tsconfig.json',
        // tsconfigRootDir: xelnagaWorldPath
      }
    }
  }
]

export default myXelnaga