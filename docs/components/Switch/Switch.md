## 开关

**示例**

<m9-switch size="large">
  <template #checkVnode>🌞</template>
  <template #uncheckVnode>🌙</template>
</m9-switch>
<m9-switch size="medium"></m9-switch>
<m9-switch size="small">
  <template #checkVnode>1</template>
  <template #uncheckVnode>2</template>
</m9-switch>
<m9-switch disabled>
  <template #checkVnode>🌞</template>
  <template #uncheckVnode>🌙</template>
</m9-switch>

**代码**

```html
<template>
  <m9-switch size="large">
    <template #checkVnode>🌞</template>
    <template #uncheckVnode>🌙</template>
  </m9-switch>
  <m9-switch size="medium"></m9-switch>
  <m9-switch size="small">
    <template #checkVnode>1</template>
    <template #uncheckVnode>2</template>
  </m9-switch>
  <m9-switch disabled>
    <template #checkVnode>🌞</template>
    <template #uncheckVnode>🌙</template>
  </m9-switch>
</template>
```

## API

| 属性           | 说明                  | 类型               | 默认值   |
| ------------- |:---------------------:| ------------------:|--------:|
| size          | 设置开关大小           | small/medium/large |  medium |
| checkVNode    | 开启状态的虚拟节点      | string             |  开     |
| uncheckVNode  | 关闭状态的虚拟节点      | string             |  关     |

**事件**

| 事件名称           | 说明           | 参数  |
| -------------     |:-------------:| -----:|
| change             | 切换开关事件    | (value: boolean) => void |

<script setup>
  const onChange2024 = (open) => {
    console.log('🚀 ~ onChange2024: ', open)
  }
</script>