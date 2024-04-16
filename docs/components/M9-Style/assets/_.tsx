import { computed, defineComponent } from "vue"
import M9IconCtor from './icons'

export default defineComponent({
  name: 'M9SvgComponent',
  props: {
    icon: { type: String, required: true }
  },
  emits: ['click'],
  setup (props, ctx) {
    const classNames = computed(() => {
      return `m9-icon ${ctx.attrs.className || ''}`
    })

    const m9Icon = computed(() => {
      return M9IconCtor()._get(props.icon) || ""
    })

    function onIconClick () {
      ctx.emit('click')
    }


    return { classNames, m9Icon, onIconClick }
  },

  render () {
    const { m9Icon, onIconClick } = this
    const { style } = this.$attrs

    return (
      <div v-html={m9Icon} onClick={onIconClick}></div>
    )
  }
})