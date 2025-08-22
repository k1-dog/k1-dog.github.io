import DefaultTheme from 'vitepress/theme'
import '@k1/styles/style.scss' // 打包时把这行注释放开, 打包的内容里会带上 style.css 全部的样式文件

DefaultTheme.enhanceApp = async ({ app, router, siteData }) => {
  if (!import.meta.env.SSR) {
    // 浏览器环境才执行DOM操作 - ssr服务端渲染不执行浏览器API
    const K1M9UI = await import('@k1/ui-lib/index')

    app.config.globalProperties.$M9MsgX = K1M9UI.M9MsgX
    app.config.globalProperties.$M9DragHelperX = K1M9UI.M9DragHelperX
    app.config.globalProperties.$M9K1ChartX = K1M9UI.M9K1ChartX

    K1M9UI.M9InstallX(app)
  }
}

export default {
  ...DefaultTheme
}