import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5175,
    strictPort: true,
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'VueGreenbornReporteContextual',
      fileName: (format) =>
        format === 'es'
          ? 'vue-greenborn-reporte-contextual.js'
          : `vue-greenborn-reporte-contextual.${format}.cjs`,
      formats: ['es', 'umd'],
      cssFileName: 'vue-greenborn-reporte-contextual',
    },
    rollupOptions: {
      external: ['vue', 'vue-greenborn-modal-manager'],
      output: {
        exports: 'named',
        globals: {
          vue: 'Vue',
          'vue-greenborn-modal-manager': 'VueGreenbornModalManager',
        },
        assetFileNames: (assetInfo) =>
          assetInfo.name && assetInfo.name.endsWith('.css')
            ? 'vue-greenborn-reporte-contextual.css'
            : assetInfo.name,
      },
    },
    cssCodeSplit: false,
    sourcemap: true,
    minify: 'esbuild',
  },
})
