import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  // Un único Vue: el paquete local (file:) no debe cargar su propia copia.
  resolve: { dedupe: ['vue'] },
  server: {
    port: 5175,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://localhost:4300', changeOrigin: false },
    },
  },
})
