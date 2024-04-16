## 导航布局容器组件

**示例**

<m9-navigation :menus="menus">
  <div>美九的M9Charts图表展示库</div>
</m9-navigation>

**代码**

```html
<template>
  <m9-navigation :menus="menus">
    <div>美九的M9Charts图表展示库</div>
  </m9-navigation>
</template>
```

## API

| 属性    | 说明         | 类型  | 默认值  |
| -------|:------------:| -----:| -----:|
| menus  | 侧导航菜单配置 | Array<> | [] |

**事件**

| 事件名称          | 说明          | 参数  |
| ---------------- |:-------------:| -----:|
| onClickMenuItem  | 点击菜单项事件 | (m9MenuItem: MNavMenuItem) => void |
<script setup>
  import { ref } from 'vue'
  import M9Navigation from './Navigation'

  const menus = ([
    {
      key: 'a',
      label: '菜单-01',
      children: [
        { key: '1', label: '折纸' },
        { key: '2', label: '二亚' },
        { key: '3', label: '狂三' },
      ]
    },
    { key: 'b', label: '菜单-02' },
    {
      key: 'c',
      label: '菜单-03',
      children: [
        { key: 'd', label: '菜单-03-1' },
        {
          key: 'e',
          label: '菜单-03-2',
          children: [
            { key: '4', label: '小四' },
            { key: '5', label: '琴里' },
            { key: '6', label: '六儿' },
          ]
        },
        { key: 'f', label: '菜单-03-3' }
      ]
    },
    { key: 'g', label: '菜单-04' }
  ])
</script>
  
<style lang="scss">
  /* @import './Navigation.scss'; */
</style>