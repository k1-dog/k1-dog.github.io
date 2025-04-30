import classNames from 'classnames'
import M9Icon from '@k1/styles/assets/_'
import { PropType, VNode, defineComponent } from 'vue'

export interface MInputProps {
    /**
     * @description input 输入框大小
     */
    size : 'latge' | 'small' | 'medium';

    /**
     * @description input输入框的受控值1
     */
    value : string;

    /**
     * @description prepend [<-input框前置元素<-]
     */
    prepend : string | VNode;

    /**
     * @description append [->input框后置元素->]
     */
    append : string | VNode;

    /**
     * @description disable 禁用标志
     */
    disabled : boolean;

    // ? 自定义的 输入框后尾图标
    customIcon: string;

    /**
     * @description 受控值的变化回调函数
     */
    onChange : (e : string) => void;

    /**
     * @description input 失焦回调
     */
    onBlur : (e : Event) => void;

    /**
     * @description input 聚焦回调
     */
    onFocus : (e : Event) => void;
}

export default defineComponent({
  name: 'M9Input',
  props: {
    modelValue: {
      type: String as PropType<MInputProps['value']>,
      default: '美九未来'
    },
    size: {
      type: String as PropType<MInputProps['size']>,
      default: 'large'
    },
    disabled: {
      type: Boolean as PropType<MInputProps['disabled']>,
      default: false
    },
    customIcon: {
      type: String as PropType<MInputProps['customIcon']>,
      default: 'search'
    }
  },
  emits: ['change', 'blur', 'focus', 'update:modelValue'],
  setup (props, ctx) {
    /**
     * @description Blur事件可完成部分防抖功能
     * @param {Event} e
     */
    function handleBlur (e : Event) {
      (e.target as any).value = ''
      ctx.emit('blur', e)
    };

    function handleFocus (e : Event) {
        ctx.emit('focus', e)
    };
    function handleChange (e : Event) {
        ctx.emit('change', (e.target as any).value)
        ctx.emit('update:modelValue', (e.target as any).value)
    };
    return {
      handleBlur,
      handleFocus,
      handleChange
    }
  },
  render() {
    const PreCls = "miku-input"
    const { handleBlur, handleFocus, handleChange } = this
    const { modelValue, size, disabled = false, customIcon, ...otherProps } = this.$props

    const prepend = this.$slots.prepend && this.$slots.prepend()
    const append = this.$slots.append && this.$slots.append()

    const InputPreCls = classNames(
        PreCls,
        size && `${PreCls}-size-${size}`,
        disabled && `${PreCls}__disable`
    )

    const inputID = `m9-input-${Date.now()}`

    return (
      <div className={InputPreCls}>
        {prepend && <div className={`${PreCls}__pre`}>{prepend}</div>}
        <input
          id={inputID}
          className={`${PreCls}__inner`}
          {...otherProps}
          // value={modelValue}
          disabled={disabled}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        <label className={`${PreCls}__label`} for={inputID}>{modelValue || '美九未来'}</label>
        {<M9Icon icon={customIcon} style="width: 24px; cursor: pointer; position: absolute; top: 50%; right: 1rem; transform: translateY(-50%)"></M9Icon>}
        {append && <div className={`${PreCls}__apd`}>{append}</div>}
      </div>
    )
  }
})