## 标签栏

**示例**

<m9-tabs v-model:activeKey="ak">
  <m9-tab-pane :k="'Tab' + (i+1)" :title="'标签' + (i+1)" v-for="i in 15" :key="i"><div>-{{ i + 1 }}号-内容区域</div></m9-tab-pane>
</m9-tabs>

**代码**

```html
<m9-tabs v-model:activeKey="ak">
  <m9-tab-pane k="Tab1" title="标签1"><div>-1号-内容区域</div></m9-tab-pane>
  <m9-tab-pane k="Tab2" title="标签2"><div>-2号-内容区域</div></m9-tab-pane>
  <m9-tab-pane k="Tab3" title="标签3"><div>-3号-内容区域</div></m9-tab-pane>
  <m9-tab-pane k="Tab4" title="标签4"><div>-4号-内容区域</div></m9-tab-pane>
</m9-tabs>
```

## API

| 属性                | 说明                      |     类型  | 默认值 |
| ------------------ |:-------------------------:|----------:| ---: |
| v-model:activeKey  | 双向绑定当前标签激活的Key值 | string    |  ''  |
| TabPane.k          | 每个标签的k值              | string    |  ''  |
| TabPane.title      | 每个标签的标题说明          | string    |  ''  |

**事件**

| 事件名称           | 说明          | 参数         |
| -------------     |:-------------:| ------------:|
| change            | 标签切换事件   | (ak) => void |

<script setup>
</script>
