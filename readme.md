# M9-K1

<nobr>
![vue3.x](https://img.shields.io/badge/vue3.x-purple)
</nobr>
<nobr>
![typescript](https://img.shields.io/badge/typescript-red)
</nobr>
<nobr>
![scss](https://img.shields.io/badge/scss-yellow)
</nobr>
<nobr>
![K1-UI](https://img.shields.io/badge/K1-UI-green)
</nobr>
<nobr>
![vitepress](https://img.shields.io/badge/vitepress-orange)
</nobr>

##

The PC UI Components built on Vue3.x!

Vue3.x 打造的基础通用组件，vitepress搭建文档站点

## Docs Site

 - [m9-k1 ui](https://k1-dog.github.io/components/k1-boot.html)

## Usage

Install m9-k1-ui with npm

```bash
  npm install @kego/m9-k1-ui
```
main.js 加载注册组件
```bash
    import { createApp } from 'vue'
    import AppUI from './App.tsx'
    // !  <<< - use - miku-global-scss
    import '@kego/m9-k1-ui/style.css'
    // !  - use - miku-global-scss >>>
    // !  <<< - use - m9-k1-vue
    import m9 from '@kego/m9-k1-ui/m9-k1-vue.es.ts'
    // !  - use - m9-k1-vue >>>

    console.log(m9)

    const app = createApp(AppUI).use(m9.m9Install)

    app.mount('#app')

```
    
## Themes

支持明暗模式双色主题（推荐暗黑模式）

## Features
    1.  单实例 - dragHelper提示线
    2.  性能优化 - 虚拟滚动、防抖节流
    3.  高度集成 - 表单校验能力
    4.  部分可视化图表 - 柱状图、饼状图
    5.  TS - 类型校验

## 风格参考
    m9-k1 UI库的启蒙组件库 - PrimeVue（国外）