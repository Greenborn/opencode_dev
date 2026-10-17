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
      name: 'VueGreenbornTreeView',
      fileName: (format) =>
        format === 'es'
          ? 'vue-greenborn-tree-view.js'
          : `vue-greenborn-tree-view.${format}.cjs`,
      formats: ['es', 'umd'],
      cssFileName: 'vue-greenborn-tree-view',
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        exports: 'named',
        globals: { vue: 'Vue' },
        assetFileNames: (assetInfo) =>
          assetInfo.name && assetInfo.name.endsWith('.css')
            ? 'vue-greenborn-tree-view.css'
            : assetInfo.name,
      },
    },
    cssCodeSplit: false,
    sourcemap: true,
    minify: 'esbuild',
  },
})
