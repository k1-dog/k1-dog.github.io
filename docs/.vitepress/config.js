import vueJsx from "@vitejs/plugin-vue-jsx"


module.exports = {
  // 站点标题
  title: 'K1 m9-ui-vue',
  // 打包目录
  dest: './dist',
  // 部署的基础路径
  base: '/',
  srcDir: '.',
  head: [
    // 添加图标
    ['link', { rel: 'icon', href: '/miku-logo.webp' }]
  ],
  themeConfig: {
    siteTitle: '美九未来 Vue-UI',
    logo: '/miku-logo.webp',
    // 网站描述
    description: 'K1系列 美九未来 Vue版本组件库',
    // 启动页面丝滑滚动
    smoothScroll: true,
    // 导航栏配置
    nav: [
      { text: '美九的小窝', link: 'https://miku-space.com/' },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/k1-dog/k1-dog.github.io/tree/master" },
    ],
    sidebar: [
      {
        text: 'K1风格 组件库简介',
        link: '/components/k1-boot.md'
      },
      ...createButtonMenus(),
      ...createInputMenus(),
      ...createSwitchMenus(),
      ...createSelectMenus(),
      ...createCheckBoxMenus(),
      ...createDatePickerMenus(),
      ...createPopoverMenus(),
      ...createFileMenus(),
      ...createTableMenus(),
      ...createFormMenus(),
      ...createNaviMenus(),
      ...createModalMenus(),
      ...createLoadingMenus(),
      ...createMessageMenus(),
      ...createM9ChartsMenus()
    ],
    footer: {
      message: 'K1舞动未来 - 技术引领潮流',
      copyright: 'Copyright © 2024-kego 美九未来 妖苏时刻'
    }
  },
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          // additionalData: '@import "/packages/style.scss";' // !~~靠 -少个分号都不行 看来这是配置的 scss 语法命令, 较严格
        }
      }
    },
    plugins: [
      vueJsx()
    ]
  }
}

// 1.
function createButtonMenus () {
  return [
    {
      text: 'Button 按钮',
      link: '/components/Button/Button.md'
    }
  ]
}
// 2.
function createSelectMenus () {
  return [
    {
      text: 'Select 选择框',
      link: '/components/Select/Select.md'
    }
  ]
}
// 3.
function createSwitchMenus () {
  return [
    {
      text: 'Switch 开关',
      link: '/components/Switch/Switch.md'
    }
  ]
}
// 4.
function createInputMenus () {
  return [
    {
      text: 'Input 输入框',
      link: '/components/Input/Input.md'
    }
  ]
}
// 5.
function createDatePickerMenus () {
  return [
    {
      text: 'DatePicker 时间选择器',
      link: '/components/DatePicker/Date.md'
    }
  ]
}
// 6.
function createCheckBoxMenus () {
  return [
    {
      text: 'CheckBox 选择框',
      link: '/components/CheckBox/CheckBox.md'
    }
  ]
}
// 7.
function createPopoverMenus () {
  return [
    {
      text: 'Popover 气泡',
      link: '/components/Popover/Popover.md'
    }
  ]
}
// 15.
function createFileMenus () {
  return [
    {
      text: 'Filer 文件处理器',
      link: '/components/File/File.md'
    }
  ]
}
// 8.
function createTableMenus () {
  return [
    {
      text: 'Table 表格',
      link: '/components/Table/Table.md'
    }
  ]
}
// 9.
function createFormMenus () {
  return [
    {
      text: 'Form 表单',
      link: '/components/Form/Form.md'
    }
  ]
}
// 10.
function createNaviMenus () {
  return [
    {
      text: 'Navigation 导航布局容器',
      link: '/components/Navigation/Navigation.md'
    }
  ]
}
// 11.
function createModalMenus () {
  return [
    {
      text: 'Modal 弹框',
      link: '/components/Modal/Modal.md'
    }
  ]
}
// 12.
function createLoadingMenus () {
  return [
    {
      text: 'Loading 加载框',
      link: '/components/Spin/Spin.md'
    }
  ]
}
// 13.
function createMessageMenus () {
  return [
    {
      text: 'Message 消息框',
      link: '/components/Message/Message.md'
    }
  ]
}
// 14.
function createM9ChartsMenus () {
  return [
    {
      text: 'Charts 图表库',
      link: '/components/M9-Charts/m9-charts.md'
    }
  ]
}