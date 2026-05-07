import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

const boxProxyTarget = process.env.PET_BOX_URL || "http://127.0.0.1:26681"
const deviceProxyTarget = process.env.PET_DEVICE_URL || "http://127.0.0.1:17890"

// https://vite.dev/config/
export default defineConfig({
  base: "./",
  plugins: [vue()],
  server: {
    proxy: {
      "/api": {
        target: boxProxyTarget,
        changeOrigin: true,
      },
      "/device-api": {
        target: deviceProxyTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/device-api/, ""),
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/features/glenclaw-home/**/*.{ts,vue}", "src/pages/HomePage.vue"],
      thresholds: {
        lines: 88,
        functions: 88,
        branches: 88,
        statements: 88,
      },
    },
  },
})
