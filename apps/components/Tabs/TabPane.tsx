import { PropType, computed, defineComponent, h } from "vue";
import { M9TabsProps } from "./Type";

export default defineComponent({
  name: 'M9TabPane',
  props: {
    ak: {
      type: String as PropType<M9TabsProps['activeKey']>,
      default: ''
    },
    k: {
      type: String as PropType<M9TabsProps['activeKey']>,
      default: ''
    },
    title: {
      type: String,
      default: ''
    }
  },
  setup (props, ctx) {
    const isActiving = computed(() => props.ak === props.k)

    return { isActiving }
  },
  render (s) {
    const { isActiving } = this
    const { default: _default } = this.$slots
    const children = _default ? _default() : <></>
    
    return h(children[0])
  }
})