## 消息框

**示例**
<m9-button type="main" @click="() => onMessage('success')">成功提示</m9-button>
<m9-button type="danger" @click="() => onMessage('warning')">警告提示</m9-button>
<m9-button type="pure" @click="() => onMessage('info')">信息提示</m9-button>
<m9-button type="main" @click="() => onMessage('error')">错误提示</m9-button>

**代码**

```html
<template>
  <m9-button type="main" @click="() => onMessage('success')">成功提示</m9-button>
  <m9-button type="danger" @click="() => onMessage('warning')">警告提示</m9-button>
  <m9-button type="pure" @click="() => onMessage('info')">信息提示</m9-button>
  <m9-button type="main" @click="() => onMessage('error')">错误提示</m9-button>
</template>
```

## API

| 属性 | 说明        |            类型            |  默认值  |
| ---- |:----------:|---------------------------:|---------:|
| type | 消息的类型  | success\warning\error\info |  success |
| text | 消息文本    |           string           |   ''    |
| life | 持续时间    |           number           |    0    |

**事件**

| 事件名称 | 说明           | 参数        |
| --------|:--------------:| -----------:|
| close   | 消息关闭点击事件 | () => void |

<script setup>
  import { getCurrentInstance } from 'vue'
  const vm = getCurrentInstance()
  const $M9MsgX = vm.proxy.$M9MsgX
  const onMessage = (msgType) => {
    $M9MsgX[msgType]({ text: '！侦测到在途的巨变打击', life: 0 })
  }
</script>