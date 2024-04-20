import classNames from 'classnames'
import MNavBody from './NavBody'
import MNavHeader from './NavHeader'
import MNavFooter from './NavFooter'
import MNavSidebar from './NavSidebar'
import { MNavProps, MNavSlots, MNavEmits, mnav_cls } from './Navigation.type'
import { defineComponent, PropType } from 'vue'

export default defineComponent({
  name: "M9Navigation",
  props: {
    menus: {
      type: Array as PropType<MNavProps['menus']>,
      required: true,
      default: () => []
    }
  },
  setup () {
    return {}
  },
  render(_this) {
    const preCls = mnav_cls

    const _class_ = classNames(preCls)
    
    const defaultChild = this.$slots.default!()
    
    return (
      <div className={_class_}>
        <MNavHeader></MNavHeader>
        <MNavBody>{defaultChild}</MNavBody>
        <MNavFooter></MNavFooter>
        <MNavSidebar menus={this.$props.menus}></MNavSidebar>
      </div>
    )
  }
})