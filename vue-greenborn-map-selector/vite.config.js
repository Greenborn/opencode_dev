import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5179,
    strictPort: true,
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'VueGreenbornMapSelector',
      fileName: (format) =>
        format === 'es'
          ? 'vue-greenborn-map-selector.js'
          : `vue-greenborn-map-selector.${format}.cjs`,
      formats: ['es', 'umd'],
      cssFileName: 'vue-greenborn-map-selector',
    },
    rollupOptions: {
      external: ['vue', 'vue-greenborn-modal-manager', 'leaflet'],
      output: {
        exports: 'named',
        globals: {
          vue: 'Vue',
          'vue-greenborn-modal-manager': 'VueGreenbornModalManager',
          leaflet: 'L',
        },
        assetFileNames: (assetInfo) =>
          assetInfo.name && assetInfo.name.endsWith('.css')
            ? 'vue-greenborn-map-selector.css'
            : assetInfo.name,
      },
    },
    cssCodeSplit: false,
    sourcemap: true,
    minify: 'esbuild',
  },
})
