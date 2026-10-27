import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'VueGreenBornMapViewer',
      fileName: (format) => `vue-greenborn-map-viewer.${format === 'es' ? 'js' : 'umd.cjs'}`
    },
    rollupOptions: {
      external: ['vue', 'leaflet'],
      output: {
        globals: {
          vue: 'Vue',
          leaflet: 'L'
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'vue-greenborn-map-viewer.css'
          return assetInfo.name
        }
      }
    }
  }
})
