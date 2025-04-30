## M9 图表数据库

**示例**

<div ref="m9"></div>

**代码**

```html
<template>
  <div ref="m9"></div>
</template>
```

## API

| 属性               | 说明           | 类型               | 默认值  |
| ------------------ |:-------------:| -----------------: | -----: |

**事件**

| 事件名称 | 说明    | 参数                    |
| --------|:-------:| ----------------------:|
<script setup>
  import { getCurrentInstance, onMounted, ref } from 'vue'
  const { proxy } = getCurrentInstance()
  const $M9K1 = proxy.$K1

  const m9 = ref()
  onMounted(() => {
    $M9K1(m9.value)
  })
</script>