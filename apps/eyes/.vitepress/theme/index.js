import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'
import './custom.css' // Custom sidebar collapse styles
import { initSidebarCollapse } from './sidebar-collapse.js'
import '@k1/styles/style.scss' // 打包时把这行注释放开, 打包的内容里会带上 style.css 全部的样式文件

DefaultTheme.enhanceApp = async ({ app, router, siteData }) => {
  if (!import.meta.env.SSR) {
    // 浏览器环境才执行DOM操作 - ssr服务端渲染不执行浏览器API
    const K1M9UI = await import('@k1/ui-lib/index')

    app.config.globalProperties.$M9MsgX = K1M9UI.M9MsgX
    app.config.globalProperties.$M9DragHelperX = K1M9UI.M9DragHelperX
    app.config.globalProperties.$K1TsukiyoX = K1M9UI.K1TsukiyoX
    app.config.globalProperties.$K1ShapesX = K1M9UI.K1ShapesX
    app.config.globalProperties.$K1RgbaX = K1M9UI.K1RgbaX
    app.config.globalProperties.$K1GrowX = K1M9UI.K1GrowX
    app.config.globalProperties.$K1PenX = K1M9UI.K1PenX
    app.config.globalProperties.$K1SpecOfX = K1M9UI.K1SpecOfX
    app.config.globalProperties.$K1AxisX = K1M9UI.K1AxisX
    app.config.globalProperties.$K1RadarX = K1M9UI.K1RadarX
    app.config.globalProperties.$K1DrawMugenX = K1M9UI.K1DrawMugenX

    K1M9UI.M9InstallX(app)

    // Restore sidebar collapse state from localStorage on first client load
    initSidebarCollapse()
  }
}

export default {
  ...DefaultTheme,
  Layout
}