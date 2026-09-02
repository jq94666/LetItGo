import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  base: './',
  plugins: [
    vue(),
    tailwindcss(),
    legacy({
      // 旧版包（SystemJS + 语法降级 + core-js）要覆盖的浏览器。
      // 注意：现代包的基线由插件固定（Chrome 105 / Edge 105 / Firefox 106 / Safari 16.4 / iOS 16.4），
      // 因此这里不要再去写 build.target，否则插件会覆盖并告警。
      targets: [
        'chrome >= 64', // 覆盖多数 Chromium 内核的国产浏览器
        'edge >= 79',
        'firefox >= 67',
        'safari >= 11.1',
        'ios >= 11.3',
        'android >= 81',
        'not dead'
      ],
      // 现代包也按代码里实际用到的 API 注入 core-js polyfill；用不到就不会产出额外文件
      modernPolyfills: true
    })
  ],
  server: {
    host: '127.0.0.1',
    port: 5173
  }
})
