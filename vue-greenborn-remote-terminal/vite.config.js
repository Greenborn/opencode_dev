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
      name: 'VueGreenbornRemoteTerminal',
      fileName: (format) =>
        format === 'es'
          ? 'vue-greenborn-remote-terminal.js'
          : `vue-greenborn-remote-terminal.${format}.cjs`,
      formats: ['es', 'umd'],
      cssFileName: 'vue-greenborn-remote-terminal',
    },
    rollupOptions: {
      external: ['vue', '@xterm/xterm', '@xterm/addon-fit'],
      output: {
        exports: 'named',
        globals: {
          vue: 'Vue',
          '@xterm/xterm': 'XTerm',
          '@xterm/addon-fit': 'FitAddon',
        },
        assetFileNames: (assetInfo) =>
          assetInfo.name && assetInfo.name.endsWith('.css')
            ? 'vue-greenborn-remote-terminal.css'
            : assetInfo.name,
      },
    },
    cssCodeSplit: false,
    sourcemap: true,
    minify: 'esbuild',
  },
})
