## 表格

**示例**

<m9-table :MTableColumns="MTHColumns" :MikuDataSource="MTDataSource0" :MKey="'key'">
</m9-table>

**代码**

```html
<template>
  <m9-table :MTableColumns="MTHColumns" :MikuDataSource="MTDataSource" :MKey="'key'"></m9-table>
</template>
```

## API

| 属性           | 说明           | 类型  | 默认值  |
| ------------- |:-------------:| -----:| -----: |
| MTableColumns       | 表头数据配置   | MTableColumns | [] |
| MikuDataSource| 表身数据源配置 | MikuDataSource | [] |

**事件**

| 事件名称           | 说明           | 参数  |
| -------------     |:-------------:| -----:|
| onChangePagi      | 分页点击事件    | (pagi: PagiInfo) => void |

<script setup>
  // ? 测试千万级树表结构数据用例
  const prefix = 'miku'
  const MTHColumns = Array.from({ length: 10 }, (_, _i) => {
    return {
      key: prefix + '-' + _i,
      title: '美九' + '-' + _i,
      fixed: _i < 2 ? 'left' : _i > 5 ? 'right' : undefined,
      sortable: _i === 6,
      filterable: _i === 1,
      isTreeNode: _i === 0
    }
  })
  const MTDataSource = Array.from({ length: 100000 }, (_, _i) => {
    return MTHColumns.reduce((RowData, column, _j) => {
      RowData[column.key]='美九'+'-'+_i+'-'+_j;
      if (Math.ceil(_i / 100) === Math.floor(_i / 100)) {
        RowData['children'] = Array.from({ length: 10 }, (_, _childIndex) => {
          return MTHColumns.reduce((ChildRowData, column, _childJndex) => {
            ChildRowData[column.key] = '孩子' + '-' + _i + '-' + _childIndex + '.' + _childJndex
            if (_childIndex === 1) {
              ChildRowData['children'] = Array.from({ length: 5 }, (_, _grandSonIndex) => {
                return MTHColumns.reduce((GrandSonRowData, column, _grandSonJndex) => {
                  GrandSonRowData[column.key] = '孙子' + '-' + _i + '-' + _childIndex + '.' + _childJndex + '>' + _grandSonIndex + '.' + _grandSonJndex
                  return GrandSonRowData
                }, {})
              })
            }
            return ChildRowData
          }, {})
        })
      }
      return RowData
    }, {})
  })
  const MTDataSource0 = Array.from({ length: 100000 }, (_, _i) => {
    return MTHColumns.reduce((RowData, column, _j) => {
      RowData[column.key]='美九'+'-'+_i+'-'+_j
      return RowData
    }, {})
  })
</script>