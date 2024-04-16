## 按钮

**示例**

<m9-button size="small">开心</m9-button>
<m9-button type="pure" size="medium" @click="onClick2024">2024</m9-button>
<m9-button type="danger" size="large" @click="onClick2024">2024</m9-button>
<m9-button type="k1" size="large" @click="onClick2024">2024</m9-button>
<m9-button type="main" size="medium" shape="circle" @click="onClick2024">^</m9-button>

**代码**

```html
<template>
  <m9-button size="small" >开心</m9-button>
  <m9-button  type="k1" size="large" @click="onClick2024">新增</m9-button>
</template>
```

## API

| 属性           | 说明          |     类型            | 默认值  |
| ------------- |:-------------:|--------------------:| ------: |
| type          | 按钮的风格类型 | k1\main\pure\danger |  main   |
| shape         | 按钮的形状类型 | circle\square       |  square |
| size          | 按钮的大小类型 | small\medium\large  |  关     |

**事件**

| 事件名称           | 说明          | 参数       |
| -------------     |:-------------:| ----------:|
| click             | 按钮点击事件   | () => void |

<script setup>
  import { ref } from 'vue'
  import M9Button from './Button'

  const onClick2024 = (e) => {
    // e.stopPropagation()
    console.log('🚀 ~ onClick2024: ', e, onClick2024)
  }
</script>
<style lang="scss">
  /* @import './Button.scss'; */
</style>
