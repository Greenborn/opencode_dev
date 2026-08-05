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
      name: 'VueGreenbornSSO',
      fileName: (format) =>
        format === 'es' ? 'vue-greenborn-sso-front.js' : `vue-greenborn-sso-front.${format}.cjs`,
      formats: ['es', 'umd'],
    },
    rollupOptions: {
      external: ['vue', 'vue-router'],
      output: {
        exports: 'named',
        globals: { vue: 'Vue', 'vue-router': 'VueRouter' },
        assetFileNames: (assetInfo) =>
          assetInfo.name && assetInfo.name.endsWith('.css')
            ? 'vue-greenborn-sso-front.css'
            : assetInfo.name,
      },
    },
    cssCodeSplit: false,
    sourcemap: true,
    minify: 'esbuild',
  },
})
