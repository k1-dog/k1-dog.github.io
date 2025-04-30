import MTransition from '../Transtions'
import M9Icon from '@k1/styles/assets/_'
import { defineComponent, reactive, watchEffect, PropType, TransitionGroup } from "vue"
import { MNavSidebarProps, MNavMenuItem, mnav_sidebar_cls, mnav_sidebar_title_cls, mnav_sidebar_menus_cls, mnav_sidebar_menus_item_cls, mnav_sidebar_menus_item_icon_cls, mnav_sidebar_menus_item_text_cls, menu_item_indent_size } from './Navigation.type'
const MRipple = MTransition.MRipple

export default defineComponent({
  name: 'M9NavSidebar',
  props: {
    menus: {
      type: Array as PropType<MNavSidebarProps['menus']>,
      required: true,
      default: () => []
    }
  },
  setup (props, ctx) {
    const state = reactive<{ m9Menus: MNavSidebarProps['menus'] }>({
      m9Menus: []
    })
    // 扁平化传入的原始树形菜单
    function transformM9Menus (menus: MNavSidebarProps['menus'], level: MNavMenuItem['level'] = 0 ): MNavSidebarProps['menus'] {
      let _m9Menus = menus.reduce<MNavSidebarProps['menus']>(($m9Menus, menu, _i) => {
        menu.level = level
        $m9Menus.push(menu)

        if (Array.isArray(menu.children)) {
          const childrenMenusList = transformM9Menus(menu.children, level + 1)
          $m9Menus = $m9Menus.concat(childrenMenusList)
          // ! 这个length这里, 不能只赋值直接孩子的个数, 要深度计算其下所有孩子个数才对
          menu.childrenLength = childrenMenusList.length
          delete menu['children']
        } else {
          menu.childrenLength = 0
        }

        return $m9Menus
      }, [])
      return _m9Menus
    }
    // * 扩展 扁平后的 美九菜单数据源 - 填充一些必要属性
    function extendM9menus (menus: MNavSidebarProps['menus']) {
      for (let _g = 0; _g < menus.length; _g++) {
        const menuItem = menus[_g]
        menuItem.no = _g
        menuItem.isAlive = true
        menuItem.isCollapse = false
      }

      return menus
    }
    // 拥有子菜单的父菜单, 展开与收起点击事件
    function onMenuItemExpandOrFold (menuItem: MNavMenuItem) {
      const { no, isCollapse, childrenLength } = menuItem
      for (let _j = no + 1; _j <= no + childrenLength; _j++ ) {
        state.m9Menus[_j].isAlive = isCollapse // 对menuItem下边所有的子菜单, 存活开关取反
      }
      menuItem.isCollapse = !isCollapse
    }
    
    function onSelectMenuItem (menuItem: MNavMenuItem) {
      const { key } = menuItem
      state.m9Menus.forEach((eachMenuItem) => {
        if (eachMenuItem.key === key) {
          eachMenuItem.isSelected = true
        } else {
          eachMenuItem.isSelected = false
        }
      })

      state.m9Menus = [...state.m9Menus]
    }

    watchEffect(() => {
      state.m9Menus = extendM9menus(transformM9Menus(props.menus))
    })

    return {
      state,
      onSelectMenuItem,
      onMenuItemExpandOrFold
    }
  },
  render () {
    const { onSelectMenuItem, onMenuItemExpandOrFold, state } = this

    const m9Menus = state.m9Menus

    return (
      <div className={mnav_sidebar_cls}>
        <div className={mnav_sidebar_title_cls}>导航菜单</div>
        <TransitionGroup name={mnav_sidebar_menus_cls} tag="ul" className={mnav_sidebar_menus_cls}>
          {
            // 这个transition 想要生效, 下边包裹的每个元素, 在这里就是 MRipple 元素必须添加 key值, 否则无效
            m9Menus.map(menuItem => {
              return (
                <MRipple key={menuItem.key} v-show={menuItem.isAlive}>
                <li
                  key={menuItem.key}
                  className={`${mnav_sidebar_menus_item_cls} ${menuItem.isSelected && 'is-selected' || ''}`}
                  style={{ paddingLeft: menuItem.level! * menu_item_indent_size + 'px' }}
                  onClick={() => { onSelectMenuItem(menuItem) }}
                >
                  <div className={mnav_sidebar_menus_item_icon_cls}><M9Icon icon="menu-home"></M9Icon></div>
                  <div className={mnav_sidebar_menus_item_text_cls}>{menuItem.label}</div>
                  {
                    menuItem.childrenLength !== 0
                    &&
                    <span
                      class="heart-switcher"
                      onClick={(e) => {
                        e.stopPropagation()
                        onMenuItemExpandOrFold(menuItem)
                      }}
                    >{menuItem.isCollapse && '💜' || '🤍'}</span>
                    || null
                  }
                </li>
                </MRipple>
              )
            })
          }
        </TransitionGroup>
      </div>
    )
  }
})