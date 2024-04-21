
import { resolve } from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'

// https://vitejs.dev/config/
export default defineConfig({
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: '@import "@/styles/index.scss";' // !~~靠 -少个分号都不行 看来这是配置的 scss 语法命令, 较严格
      }
    }
  },
  plugins: [vue(), vueJsx()],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    alias: {
      '@': resolve(__dirname, 'src') // 设置 `@` 指向 `src` 目录
    }
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'docs/packages/index.ts'),
      name: 'm9-k1-vue',
      formats: ["es", "umd"],
      fileName: (format) => `m9-k1-vue.${format}.ts`
    },
    assetsDir: 'assets',
    outDir: 'm9-bundle',
    rollupOptions: {
      // 确保外部化处理那些你不想打包进库的依赖
      external: ['vue'],
      output: {
        // 在 UMD 构建模式下为这些外部化的依赖提供一个全局变量
        globals: {
          vue: 'Vue'
        }
      }
    }
  },
  server: {
    port: 1573, // 设置服务启动端口号
    open: true, // 设置服务启动时是否自动打开浏览器
    // 代理
    proxy: {}
  }
})
