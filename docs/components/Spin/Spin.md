## 按钮

**示例**
<m9-spin :spinning="true">
  <div style="width: 100px; height: 100px;color: black;">22</div>
</m9-spin>
<m9-spin>
<m9-button :spinning="true" type="main">可口可乐</m9-button>
</m9-spin>

<!-- <m9-spin size="small"></m9-spin> -->
**代码**

```html
<template>
<m9-spin></m9-spin>
<m9-spin></m9-spin>
</template>
```

## API

| 属性     | 说明       | 类型    | 默认值  |
| ---------|:----------:| -------:| ------:|
| spinning | 加载开关   | boolean |  false |

<script setup>
  import { ref } from 'vue'
  import M9Spin from './Spin'
  import M9Button from '../Button/Button'
</script>
<style lang='scss'>
</style>
