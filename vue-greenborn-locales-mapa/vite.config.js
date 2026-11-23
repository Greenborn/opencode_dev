import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'GreenbornLocalesMapa',
      fileName: (format) => (format === 'es' ? 'vue-greenborn-locales-mapa.js' : 'vue-greenborn-locales-mapa.cjs'),
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['vue', '@greenborn/vue-greenborn-map-viewer'],
      output: { exports: 'named', globals: { vue: 'Vue' } },
    },
    sourcemap: true,
    minify: 'esbuild',
  },
})
