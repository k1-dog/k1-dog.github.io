import { createApp } from 'vue'
import AppUI from './App.tsx'
// !  <<< - use - miku-global-scss
import '@kego/m9-k1-ui/style.css'
// !  - use - miku-global-scss >>>
// !  <<< - use - m9-k1-vue
import { M9InstallX } from '@kego/m9-k1-ui/m9-k1-vue.es.ts'
// !  - use - m9-k1-vue >>>

// ! 全局注册 dayjs 时间处理服务
import dayjs from 'dayjs'

const app = createApp(AppUI).use(M9InstallX)

app.config.globalProperties.$dayjs = dayjs // * 全局挂载 ~ dayjs 轻量时间函数库

app.mount('#app')
