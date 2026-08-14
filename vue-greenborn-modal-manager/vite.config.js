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
      name: 'VueGreenbornModalManager',
      fileName: (format) =>
        format === 'es'
          ? 'vue-greenborn-modal-manager.js'
          : `vue-greenborn-modal-manager.${format}.cjs`,
      formats: ['es', 'umd'],
      cssFileName: 'vue-greenborn-modal-manager',
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        exports: 'named',
        globals: { vue: 'Vue' },
        assetFileNames: (assetInfo) =>
          assetInfo.name && assetInfo.name.endsWith('.css')
            ? 'vue-greenborn-modal-manager.css'
            : assetInfo.name,
      },
    },
    cssCodeSplit: false,
    sourcemap: true,
    minify: 'esbuild',
  },
})