import DefaultTheme from 'vitepress/theme'
import '/packages/style.scss'

DefaultTheme.enhanceApp = async ({ app, router, siteData }) => {
  // if (!import.meta.env.SSR) {
  //   const M9DragHelper = await import('/packages/M9-Utils/draggable/element-drag-helper.tsx')
  //   app.config.globalProperties.$M9DragHelper = M9DragHelper
  // }
  const k1_m9_ui = await import('/packages/index.ts')

  app.config.globalProperties.$M9MsgX = k1_m9_ui.M9MsgX
  
  app.config.globalProperties.$K1 = k1_m9_ui.M9K1

  k1_m9_ui.M9InstallX(app)
}

export default {
  ...DefaultTheme
}