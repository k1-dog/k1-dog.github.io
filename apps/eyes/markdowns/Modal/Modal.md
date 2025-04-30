## 模态框

**示例**
<m9-modal title="美九未来 - 上方抽屉" placement="top" v-model="showTop">
  <div>测试~ 上方 - 抽屉类型 弹框</div>
</m9-modal>
<m9-modal title="美九未来 - 左侧抽屉" placement="left" v-model="showLeft">
  <div>测试~ 左侧 - 抽屉类型 弹框</div>
</m9-modal>
<m9-modal title="美九未来 - 下方抽屉" placement="bottom" v-model="showBottom">
  <div>测试~ 下方 - 抽屉类型 弹框</div>
</m9-modal>
<m9-modal title="美九未来 - 右侧抽屉" placement="right" v-model="showRight">
  <div>测试~ 右侧 - 抽屉类型 弹框</div>
</m9-modal>
<m9-modal title="美九未来 - 弹框组件" v-model="show">
  <div>
    天南地北双飞客
    老翅几回寒暑
    欢乐恨，离别苦，就中更有痴儿女
    引天山暮雪，只引向谁去
  </div>
  <div>
    <m9-button @click="onOpenLeftDrawer" type="pure">左侧抽屉 ~click me~</m9-button>
    <m9-button @click="onOpenTopDrawer" type="danger">上方抽屉 ~click me~</m9-button>
    <m9-button @click="onOpenRightDrawer" type="main">右侧抽屉 ~click me~</m9-button>
    <m9-button @click="onOpenBottomDrawer" type="pure">下方抽屉 ~click me~</m9-button>
  </div>
</m9-modal>
<m9-button @click="onOpenModal">弹框 ~click me~</m9-button>

**代码**

```html
<template>
  <m9-modal title="美九未来 - 上方抽屉" placement="top" v-model="showTop">
    <div>测试~ 上方 - 抽屉类型 弹框</div>
  </m9-modal>
  <m9-modal title="美九未来 - 左侧抽屉" placement="left" v-model="showLeft">
    <div>测试~ 左侧 - 抽屉类型 弹框</div>
  </m9-modal>
  <m9-modal title="美九未来 - 弹框组件" v-model="show">
    <div>
      天南地北双飞客
      老翅几回寒暑
      欢乐恨，离别苦，就中更有痴儿女
      引天山暮雪，只引向谁去
    </div>
    <div>
      <m9-button @click="onOpenLeftDrawer" type="pure">左侧抽屉 ~click me~</m9-button>
      <m9-button @click="onOpenTopDrawer" type="danger">上方抽屉 ~click me~</m9-button>
    </div>
  </m9-modal>
  <m9-button @click="onOpenModal">弹框 ~click me~</m9-button>
</template>
```

## API

| 属性               | 说明           | 类型              | 默认值  |
| ------------------ |:-------------:| -----------------:| -----: |
| size               | 输入框大小     | small/medium/large|  large |
| disabled           | 禁用状态       | boolean           |  false |
| v-model(modelValue)| 双向绑定值     | boolean           |  false |

**事件**

| 事件名称 | 说明        | 参数                   |
| --------|:-----------:| ----------------------:|
| ok      | 弹框确认事件 | (event: Event) => void |
| close   | 弹框关闭事件 | (event: Event) => void |

<script setup>
  import { ref } from 'vue'

  const show = ref(false)
  const onOpenModal = () => {
    show.value = true
  }

  const showTop = ref(false)
  const onOpenTopDrawer = () => {
    showTop.value = true
  }

  const showLeft = ref(false)
  const onOpenLeftDrawer = () => {
    showLeft.value = true
  }

  const showRight = ref(false)
  const onOpenRightDrawer = () => {
    showRight.value = true
  }

  const showBottom = ref(false)
  const onOpenBottomDrawer = () => {
    showBottom.value = true
  }
</script>