import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'GreenbornPerfil',
      fileName: (format) => (format === 'es' ? 'vue-greenborn-perfil.js' : 'vue-greenborn-perfil.cjs'),
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['vue'],
      output: { exports: 'named', globals: { vue: 'Vue' } },
    },
    sourcemap: true,
    minify: 'esbuild',
  },
})
