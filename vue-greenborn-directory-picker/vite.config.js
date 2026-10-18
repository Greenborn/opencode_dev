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
      name: 'VueGreenbornDirectoryPicker',
      fileName: (format) =>
        format === 'es'
          ? 'vue-greenborn-directory-picker.js'
          : `vue-greenborn-directory-picker.${format}.cjs`,
      formats: ['es', 'umd'],
      cssFileName: 'vue-greenborn-directory-picker',
    },
    rollupOptions: {
      external: ['vue', 'vue-greenborn-tree-view'],
      output: {
        exports: 'named',
        globals: { vue: 'Vue', 'vue-greenborn-tree-view': 'VueGreenbornTreeView' },
        assetFileNames: (assetInfo) =>
          assetInfo.name && assetInfo.name.endsWith('.css')
            ? 'vue-greenborn-directory-picker.css'
            : assetInfo.name,
      },
    },
    cssCodeSplit: false,
    sourcemap: true,
    minify: 'esbuild',
  },
})
