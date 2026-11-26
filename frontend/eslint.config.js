import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

const TOKEN_RULES = [
  [String.raw`rounded-([trblxyse]{1,2}-)?\[`, 'Không dùng rounded-[Npx]: dùng rounded-control/item/surface/overlay.'],
  [
    String.raw`text-\[\d+(\.\d+)?(px|rem)\]`,
    'Không dùng text-[Npx]: dùng thang chữ (tối thiểu text-2xs, nội dung đọc text-xs trở lên).',
  ],
  [String.raw`(^|\s)dark:`, 'App chỉ có giao diện sáng: không thêm class dark:.'],
]

/** Mỗi quy tắc áp cho cả chuỗi thường lẫn template literal. */
function tokenGuards(selectors) {
  return TOKEN_RULES.flatMap(([pattern, message]) =>
    selectors.map((selector) => ({ selector: selector.replace('%s', pattern), message })),
  )
}

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Design tokens (docs/ui-slop-audit.md Phase 0): bo góc, cỡ chữ đi theo thang trong index.css; app chỉ có giao diện sáng
      'no-restricted-syntax': ['error', ...tokenGuards(['Literal[value=/%s/]', 'TemplateElement[value.raw=/%s/]'])],
    },
  },
  {
    // Component do Shadcn CLI sinh ra export kèm variants: không áp quy tắc fast-refresh
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
