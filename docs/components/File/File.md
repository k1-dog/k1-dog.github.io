## 文件上传器

**示例**

<m9-filer />

**代码**

```html
<template>
  <m9-filer />
</template>
```

## API

| 属性           | 说明          |     类型            | 默认值  |
| ------------- |:-------------:|--------------------:| ------: |
| fileList      | 上传的文件列表 | Array |  []   |

**事件**

| 事件名称           | 说明            | 参数       |
| -------------     |:---------------:| ---------:|
| change            | 上传变化回调事件 | () => void |

<script setup>
  import { ref } from 'vue'
  import M9Filer from './File'
</script>
<style lang="scss"></style>
