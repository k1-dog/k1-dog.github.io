## 气泡框

**示例**
<m9-popover position="top">
  <m9-button type="pure">上方气泡</m9-button>
  <template #content><span>test popover position</span></template>
</m9-popover>
<m9-popover position="down">
  <m9-button type="pure">下方气泡</m9-button>
  <template #content><span>test popover position</span></template>
</m9-popover>
<m9-popover position="left">
  <m9-button type="pure">左侧气泡</m9-button>
  <template #content><span>test popover position</span></template>
</m9-popover>
<m9-popover position="right">
  <m9-button type="pure">右侧气泡</m9-button>
  <template #content><span>test popover position</span></template>
</m9-popover>
<m9-popover position="right">
  <span>普通标签</span>
  <template #content><span>云茹将军参上！</span></template>
</m9-popover>

**代码**

```html
<template>
  <m9-popover :content="{<span>test popover position</span>}" position="top">
    <m9-button>上方气泡</m9-button>
  </m9-popover>
  <m9-popover :content="{<span>test popover position</span>}" position="down">
    <m9-button>下方气泡</m9-button>
  </m9-popover>
  <m9-popover :content="{<span>test popover position</span>}" position="left">
    <m9-button>左侧气泡</m9-button>
  </m9-popover>
  <m9-popover :content="{<span>test popover position</span>}" position="right">
    <m9-button>右侧气泡</m9-button>
  </m9-popover>
  <m9-popover position="right">
  <span>普通标签</span>
  <template #content><span>云茹将军参上！</span></template>
</m9-popover>
</template>
```

## API

| 属性         | 说明           | 类型  | 默认值  |
| ------------ |:-------------:| -----:| -----: |
| position     | 气泡弹出位置                 | top/down/left/right |  down        |
| content      | 气泡框内部的自定义元素内容插槽 | vnode               |  () => vnode |

**事件**

| 事件名称       | 说明          | 参数  |
| ------------- |:-------------:| -----:|
| changePop     | 气泡开关事件   | (isPop: boolean) => void |
