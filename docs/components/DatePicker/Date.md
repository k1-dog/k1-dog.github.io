## 日期选择器

**示例**

<m9-date-picker mode="Day" @datePick="onDateSelect" />

**代码**

```html
<template>
  <m9-button size="small" >开心</m9-button>
  <m9-button  type="k1" size="large" @click="onClick2024">新增</m9-button>
</template>
```

## API

| 属性               | 说明          |     类型            | 默认值      |
| ------------- -----|:-------------:|--------------------:| ---------: |
| mode               | 日期选择类型   | 'Day' \ 'Month' \ 'Year' | 'Day' |
| v-model(:dateValue)| 按钮的形状类型 | string   |  square |

**事件**

| 事件名称           | 说明          | 参数       |
| -------------     |:-------------:| ----------:|
| datePick          | 日期选择事件   | () => void |

<script setup>
  import { ref } from 'vue'
  import M9DatePicker from './index'

  const onDateSelect = (D) => {
    console.log('🚀 ~ onDateSelect ', D)
  }
</script>
<style lang="scss"></style>
