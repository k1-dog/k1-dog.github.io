## 表单

**示例**

<zz-form :formModel="formModel" :formRules="formRules" v-on="zzListeners"></zz-form>

**代码**

```html
<template>
  <zz-form v-on="zzListeners"></zz-form>
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

<script setup lang="ts">

import { mockFormModel } from './Mock.tsx'

const zzFields = ['honor', 'overlord', 'like', 'jointime', 'score', 'face', '___1', 'kurumi', 'yoshino', '___2', 'kotori']
const formModel = mockFormModel(zzFields)
const formRules = {}
var ZVController
const zzListeners = {
  emitZzController: (_MountedZZVtor: any) => {
    // ! 折纸表单验证器 -构造完毕后 由子表单组件 -发射到本组件中 -并存储到本组件 的 RefImpl 响应式对象中
    ZVController = _MountedZZVtor
    console.log(ZVController)
  },
  fieldChange: (...args: any) => {
    const [FieldOptions, FieldZV$] = args
    console.log('🚀 ~ render ~ FieldOptions, FieldZV$:', FieldOptions, FieldZV$)
  },
  finalValue: (FinalValue: any) => {
    console.log('表单通过了重重考验, 终于拿到了最终的所有 -表单域值 ', FinalValue)
  }
}
</script>