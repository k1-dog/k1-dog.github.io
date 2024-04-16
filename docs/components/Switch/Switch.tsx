import classNames from 'classnames'
import { defineComponent, nextTick, PropType, reactive, VNode, watch } from 'vue'

type SwitcherSlotsT = string | number | VNode

export interface MSwitcherProps {
  isOpen: boolean
  isLoading: boolean
  size: 'large' | 'small' | 'medium'
  disabled: boolean
  checkVnode: SwitcherSlotsT
  uncheckVnode: SwitcherSlotsT
  onChange: (isOpen: boolean) => void

  [k: string]: any
}

interface MSwitcherState {
  isOpen: boolean
}

export default defineComponent({
  name: 'M9Switch',
  props: {
    modelValue: {
      type: Boolean
    },
    isLoading: {
      type: Boolean as PropType<MSwitcherProps['isLoading']>,
      default: false
    },
    size: {
      type: String as PropType<MSwitcherProps['size']>,
      default: 'medium'
    },
    disabled: {
      type: Boolean as PropType<MSwitcherProps['disabled']>,
      default: false
    },
  },
  emits: ['change', 'update:modelValue'],
  setup (props, ctx) {
    const state = reactive<MSwitcherState>({
      isOpen: false
    })
    
    function onSwitch () {
      if (props.disabled) {
        return
      }
      state.isOpen = !state.isOpen
      nextTick(() => {
        ctx.emit('change', state.isOpen)
        ctx.emit('update:modelValue', state.isOpen)
      })
    }

    watch(() => props.modelValue, (switchValue) => {
      state.isOpen = switchValue
    })

    return {
      state,
      onSwitch
    }
  },
  render() {
    const { isOpen } = this.state
    const { isLoading, size, disabled } = this.$props
    const { class: _class } = this.$attrs
    
    const preCls = 'miku-switcher'
    
    const __cls: any = {
      [`${preCls}--actived`]: isOpen,
      [`${preCls}--unactived`]: !isOpen,
      [`${preCls}--loading`]: isLoading,
      [`${preCls}--size-${size}`]: !!size,
      [`${preCls}--disabled`]: disabled
    }

    const switcherCls = classNames(preCls, __cls, _class)

    const leftVNode = this.$slots.uncheckVnode && this.$slots.uncheckVnode() || 'no'
    const rightVNode = this.$slots.checkVnode && this.$slots.checkVnode() || 'yes'
    
    return (
      <div className={switcherCls} onClick={this.onSwitch}>
        <div className={`${preCls}__left`}>{leftVNode}</div>
        <div className={`${preCls}__inner`}></div>
        <div className={`${preCls}__right`}>{rightVNode}</div>
      </div>
    )
  }
})