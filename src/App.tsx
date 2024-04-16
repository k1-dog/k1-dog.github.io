/**
 * @author 傲雪凌寒小七罪 - kego | Miku-mirai
 * @description 美九Vue - 顶层根组件
 * @description ['傲雪凌风霜']
 */

import { defineComponent } from "vue"

const App = () => {
  const menus = ([
    {
      key: 'a',
      label: '菜单-01',
      children: [
        { key: '1', label: '折纸' },
        { key: '2', label: '二亚' },
        { key: '3', label: '狂三' },
      ]
    },
    { key: 'b', label: '菜单-02' },
    {
      key: 'c',
      label: '菜单-03',
      children: [
        { key: 'd', label: '菜单-03-1' },
        {
          key: 'e',
          label: '菜单-03-2',
          children: [
            { key: '4', label: '小四' },
            { key: '5', label: '琴里' },
            { key: '6', label: '六儿' },
          ]
        },
        { key: 'f', label: '菜单-03-3' }
      ]
    },
    { key: 'g', label: '菜单-04' }
  ])
  return (
    <>
      <m9-navigation menus={menus}>
        <m9-spin spinning={true}>
          <span>美九未来</span>
        </m9-spin>
      </m9-navigation>
    </>
  )
}

export default defineComponent({
  name: 'MIKU',
  setup (props, ctx) {
    
    return App
  }
})
