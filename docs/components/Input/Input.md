## 输入框

**示例**

<m9-input v-model="value">开心</m9-input>
<m9-input disabled>开心</m9-input>

**代码**

```html
<template>
  <m9-input v-model="value">开心</m9-input>
  <m9-input disabled>开心</m9-input>
</template>
```

## API

| 属性               | 说明           | 类型               | 默认值  |
| ------------------ |:-------------:| -----------------: | -----: |
| size               | 输入框大小     | small/medium/large |  large |
| disabled           | 禁用状态       | boolean            |  false |
| v-model(modelValue)| 双向绑定值     | string             |  ''    |

**事件**

| 事件名称 | 说明    | 参数                    |
| --------|:-------:| ----------------------:|
| blur    | 失焦事件 | (event: Event) => void |
| focus   | 聚焦事件 | (event: Event) => void |

<script setup>
  import { ref } from 'vue'
  import M9Input from './Input'

  const value = ref('')

  const onBlur2024 = (be) => {
    console.log('🚀 ~ onBlur2024: ', be)
  }
</script>
<style lang="scss">
  /* @import './Input.scss'; */
</style>
