import eslint from '@eslint/js'
import nextPlugin from 'eslint-config-next/core-web-vitals'

export default [
  eslint.configs.recommended,
  ...nextPlugin,
  { ignores: ['.next/**', 'coverage/**', 'screenshot-worker/dist/**'] },
]
