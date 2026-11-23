import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * og:image phải là URL tuyệt đối (Facebook/Messenger không nhận đường dẫn tương đối).
 * Thay %OG_ORIGIN% trong index.html bằng VITE_SHARE_BASE_URL (tên miền công khai); trống thì để đường dẫn tương đối.
 */
function ogOrigin(): Plugin {
  let origin = ''
  return {
    name: 'og-origin',
    configResolved(config) {
      origin = String(config.env.VITE_SHARE_BASE_URL ?? '').replace(/\/$/, '')
    },
    transformIndexHtml: (html) => html.replaceAll('%OG_ORIGIN%', origin),
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), ogOrigin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
