import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5176,
    strictPort: true,
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'VueGreenbornDashboardCards',
      fileName: (format) =>
        format === 'es'
          ? 'vue-greenborn-dashboard-cards.js'
          : `vue-greenborn-dashboard-cards.${format}.cjs`,
      formats: ['es', 'umd'],
      cssFileName: 'vue-greenborn-dashboard-cards',
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        exports: 'named',
        globals: { vue: 'Vue' },
        assetFileNames: (assetInfo) =>
          assetInfo.name && assetInfo.name.endsWith('.css')
            ? 'vue-greenborn-dashboard-cards.css'
            : assetInfo.name,
      },
    },
    cssCodeSplit: false,
    sourcemap: true,
    minify: 'esbuild',
  },
})
