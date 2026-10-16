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
<div>
  <span>中间夹杂一个单例管控的独立气泡</span>
  <div>
    <m9-popover position="right" :isPoperOne="false">
      <m9-button>折纸</m9-button>
      <template #content><span>大师参上！</span></template>
    </m9-popover>
    <m9-popover position="right" :isPoperOne="false">
      <m9-button>二亚</m9-button>
      <template #content><span>老阿姨参上！</span></template>
    </m9-popover>
    <m9-popover position="down">
      <m9-button>三三</m9-button>
      <template #content><span>三三参上！</span></template>
    </m9-popover>
    <m9-popover position="right" :isPoperOne="false">
      <m9-button>小四</m9-button>
      <template #content><span>绅士四参上！</span></template>
    </m9-popover>
  </div>
</div>

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
  <div>
    <span>中间夹杂一个单例管控的独立气泡</span>
    <div>
      <m9-popover :content="{<span>pop 折纸</span>}" position="right" :isPoperOne="false">
        <m9-button>折纸</m9-button>
      </m9-popover>
      <m9-popover :content="{<span>pop 二二阿姨</span>}" position="right" :isPoperOne="false">
        <m9-button>二亚</m9-button>
      </m9-popover>
      <m9-popover :content="{<span>pop 三三</span>}" position="right" :isPoperOne="false">
        <m9-button>三三</m9-button>
      </m9-popover>
      <m9-popover :content="{<span>pop 绅士四</span>}" position="right" :isPoperOne="false">
        <m9-button>小四</m9-button>
      </m9-popover>
    </div>
  </div>
</template>
```

## API

| 属性         | 说明           | 类型  | 默认值  |
| ------------ |:-------------:| -----:| -----: |
| position     | 气泡弹出位置                 | top/down/left/right |  down        |
| content      | 气泡框内部的自定义元素内容插槽 | vnode               |  () => vnode |
| isPoperOne   | true=全局单例气泡（受 controller 管制，默认）；false=独立气泡，脱离 controller 自行渲染 | boolean | true |

**事件**

| 事件名称       | 说明          | 参数  |
| ------------- |:-------------:| -----:|
| changePop     | 气泡开关事件   | (isPop: boolean) => void |
