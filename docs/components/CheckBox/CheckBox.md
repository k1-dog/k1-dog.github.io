## 选择框

**示例**

<m9-check-box
  :options="CheckBoxValues_1"
  MKey='date'
  @change="(values) => { console.log(values) }"
>
  <m9-checkbox-item v-for="(item, index) in CheckBoxValues_1">
    <div className='miku-app__CheckBox--item-price'>
      <span>{{item.price}}</span>
    </div>
    <div className='miku-app__CheckBox--item-desc'>
      <span>{{item.desc}}</span>
    </div>
    <div className='miku-app__CheckBox--item-data'>
      <span>{{item.date}}</span>
    </div>
  </m9-checkbox-item>
</m9-check-box>

**代码**

```html
<template>
  <CheckBox
    :MCOP={CheckBoxValues_1}
    MCKey='date'
    @change={(values) => { console.log(values) }}
  >
    <CheckBoxItem v-for="(item, index) in CheckBoxValues_1">
      <div className='miku-app__CheckBox--item-price'>
        <span>{{item.price}}</span>
      </div>
      <div className='miku-app__CheckBox--item-desc'>
        <span>{{item.desc}}</span>
      </div>
      <div className='miku-app__CheckBox--item-data'>
        <span>{{item.date}}</span>
      </div>
    </CheckBoxItem>
  </CheckBox>
</template>
```

## API

| 属性               | 说明                   | 类型              | 默认值 |
| ------------------ |:---------------------:| -----------------:| -----:|
| disabled           | 禁用状态               | boolean           |  false|
| v-model(modelValue)| 双向绑定值             | string            |  ''   |
| options            | 选择框数据源           | CheckBoxItem[]    |  []   |
| m-key              | 选择框数据源的唯一 K 值 | string            |  'id'   |

**事件**

| 事件名称 | 说明    | 参数                    |
| --------|:-------:| ----------------------:|
| change  | 选值变化事件 | (key: string) => void |

<script setup>
  import { ref } from 'vue'
  import M9CheckBox from './CheckBox'

  const M9CheckboxItem = M9CheckBox.Item

  const CheckBoxValues_1 = [
      { price: '20', desc: 'check1', date: '1.0.0.1' },
      { price: '10', desc: 'check2', date: '2.2.2.1', disabled: true },
      { price: '30', desc: 'check3', date: '3.3.3.1' }
    ]
</script>
<style lang="scss">
  /* @import './Input.scss'; */
</style>
