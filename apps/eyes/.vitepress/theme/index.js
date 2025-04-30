import DefaultTheme from 'vitepress/theme'
import '@k1/styles/style.scss' // 打包时把这行注释放开, 打包的内容里会带上 style.css 全部的样式文件

DefaultTheme.enhanceApp = async ({ app, router, siteData }) => {
  const k1_m9_ui = await import('@k1/ui-lib/index')

  app.config.globalProperties.$M9MsgX = k1_m9_ui.M9MsgX
  app.config.globalProperties.$M9DragHelperX = k1_m9_ui.M9DragHelperX
  app.config.globalProperties.$M9K1ChartX = k1_m9_ui.M9K1ChartX

  k1_m9_ui.M9InstallX(app)
}

export default {
  ...DefaultTheme
}