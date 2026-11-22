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
      name: 'VueGreenbornCrud',
      fileName: (format) =>
        format === 'es' ? 'vue-greenborn-crud.js' : `vue-greenborn-crud.${format}.cjs`,
      formats: ['es', 'umd'],
      cssFileName: 'vue-greenborn-crud',
    },
    rollupOptions: {
      external: [
        'vue',
        '@greenborn/vue-table-editor',
        '@greenborn/vue-greenborn-modal-manager',
      ],
      output: {
        exports: 'named',
        globals: {
          vue: 'Vue',
          '@greenborn/vue-table-editor': 'VueTableEditor',
          '@greenborn/vue-greenborn-modal-manager': 'VueGreenbornModalManager',
        },
        assetFileNames: (assetInfo) =>
          assetInfo.name && assetInfo.name.endsWith('.css')
            ? 'vue-greenborn-crud.css'
            : assetInfo.name,
      },
    },
    cssCodeSplit: false,
    sourcemap: true,
    minify: 'esbuild',
  },
})
