## 表单

**示例**

<zz-form></zz-form>

**代码**

```html
<template>
  <zz-form></zz-form>
</template>
```

## API

| 属性        |       说明          |     类型            | 默认值   |
| ------------|:------------------:|--------------------:| -------:|
| formState   | 折纸表单模型域值对象 |        object       |    {}   |
| formRules   | 折纸表单模型规则对象 |        object       |    {}   |

**事件**

| 事件名称          |                说明               | 参数       | 默认值  |
| ---------------- |:---------------------------------:| ----------:| ------: |
| fieldChange      | 折纸表单单元域值变化事件            | (FieldOptions, FieldZV$, isSubmitted) => void | () => void |
| finalValue       | 折纸表单通过校验后整表域值变化事件   | (FinalFormValue) => void | () => void |
| emitZzController | 折纸表单验证器生成且挂载后的回调事件 | (zv$) => void |  () => void  |

<script setup>
  import ZzForm from './index'
</script>
<style lang="scss">
</style>
