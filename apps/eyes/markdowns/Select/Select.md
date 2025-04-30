## 选择框

**示例**

<m9-select
  filterable
  :options="options"
  :multiable="false"
  :onFilter="(opt, sv) => opt.MSLabel.includes(sv)"
  @select="(_msobj_) => { console.log(`select 组件回调输出 ${_msobj_}`) }"
/>
<m9-select
  filterable
  :options="options"
  :multiable="true"
  :onFilter="(opt, sv) => opt.MSLabel.includes(sv)"
  @select="(_msobj_) => { console.log(`select 组件回调输出 ${_msobj_}`) }"
/>

**代码**

```html
<template>
  <m9-select
    filterable
    :options="options"
    :multiable="false"
    :onFilter="(opt, sv) => opt.MSLabel.includes(sv)"
    @select="(_msobj_) => { console.log(`select 组件回调输出 ${_msobj_}`) }"
  />
  <m9-select
    filterable
    :options="options"
    :multiable="true"
    :onFilter="(opt, sv) => opt.MSLabel.includes(sv)"
    @select="(_msobj_) => { console.log(`select 组件回调输出 ${_msobj_}`) }"
  />
</template>
```

## API

| 属性               | 说明           | 类型    | 默认值 |
| ------------------ |:-------------:| -------:| ------:|
| multiable          | 是否开启多选   | boolean |  false |
| disabled           | 禁用状态       | boolean |  false |
| v-model(modelValue)| 双向绑定值     | string  |  ''    |
| onFilter           | 模糊搜索方法   | function |       |

**事件**

| 事件名称 | 说明    | 参数                   |
| --------|:-------:| ----------------------:|
| select  | 选择事件 | (_msobj_: MSelectObject) => void |

<script setup>
  const options = [
    { label: '目水悠之', value: 'mu-shui' },
    { label: '孔雀王族三公主-傲熙弦', value: 'a0-xi-xian' },
    { label: '释无泪', value: 'shi-wu-lei' },
    { label: '三花聚顶', value: 'san-hua' },
    { label: '五气朝元', value: 'wu-qi' },
    { label: '天人合一', value: 'he-yi' },
    { label: '曲径通幽', value: 'qu-jing' },
    { label: '三千青丝云飞扬', value: 'san-qian' },
    ...Array.from({ length: 10000 }, (_, i) => {
      return { label: '美九-' + i, value: 'miku-' + i }
    })
  ]
</script>