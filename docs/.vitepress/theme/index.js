import DefaultTheme from 'vitepress/theme'

DefaultTheme.enhanceApp = async ({ app, router, siteData }) => {
  const k1_m9_ui = await import('/packages/index')

  app.config.globalProperties.$M9MsgX = k1_m9_ui.M9MsgX
  app.config.globalProperties.$M9DragHelperX = k1_m9_ui.M9DragHelperX
  app.config.globalProperties.$M9K1ChartX = k1_m9_ui.M9K1ChartX

  k1_m9_ui.M9InstallX(app)
}

export default {
  ...DefaultTheme
}