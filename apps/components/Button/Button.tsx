import classNames from 'classnames'
import MTransition from '../Transtions'
import { PropType, defineComponent, reactive } from 'vue'

const MRipple = MTransition.MRipple

export interface ButtonHandleClick {
  <E3, R>(e?: E3, ...restArgs: R[]): any
}

export type TMBtnTypes = 'main' | 'pure' | 'danger' | 'mirai' | 'k1'
export type TMBtnSize = 'small' | 'medium' | 'large'
export type TMBtnShape = 'circle' | 'square'

export interface IMButtonProps {
  /**
   * @param {string | undefined} type <按钮类型>
   */
  type?: TMBtnTypes

  /**
   * @param {string | undefined} shape <按钮形状>
   */
  shape?: TMBtnShape

  /**
   * @param {string | undefined} size <按钮大小>
   */
  size?: TMBtnSize

  /**
   * @param {string | undefined} disabled <禁用标志>
   */
  disabled: boolean | undefined

  /**
   * @param {string | undefined} loading <加载标志>
   */
  loading: boolean | undefined

  /**
   * @function any <onClick>
   */
  // onClick: ButtonHandleClick

  [k: string]: any
}

export interface IMButtonState {
  loading: IMButtonProps['loading']
}

export default defineComponent({
  name: "M9Button",
  // Declare 'click' as a component custom event so @click does not fall
  // through to the root element (ripple wrapper span) native click handler.
  emits: ['click'],
  props: {
    type: {
      type: String as PropType<IMButtonProps['type']>,
      default: 'main'
    },
    shape: {
      type: String as PropType<IMButtonProps['shape']>,
      default: 'square'
    },
    size: {
      type: String as PropType<IMButtonProps['size']>,
      default: 'medium'
    },
    disabled: {
      type: Boolean as PropType<IMButtonProps['disabled']>,
      default: false
    },
    loading: {
      type: Boolean as PropType<IMButtonProps['loading']>,
      default: false
    }
  },
  setup(props, ctx) {
    const state: IMButtonState = reactive({ loading: false })
    const buttonEle: HTMLButtonElement | null = null
    const onHandleClick: Function = ($e: PointerEvent) => {
      // With `emits: ['click']` declared, emit('click') is the only trigger
      // path for the user's @click listener, so the native event can bubble
      // freely (no stopPropagation needed) without causing double fire.
      ctx.emit('click', $e)
    }
    return {
      buttonEle,
      onHandleClick
    }
  },
  render() {
    const { onHandleClick } = this
    const { type, shape, size, disabled, loading } = this.$props

    const preCls = 'miku-btn'
    const btnCls = {
      [`${preCls}-type-${type}`]: !!type,
      [`${preCls}-shape-${shape}`]: !!shape,
      [`${preCls}-size-${size}`]: !!size,
      [`${preCls}-disabled`]: disabled,
      [`${preCls}-loading`]: loading
    }
    const { class: customClass = {} } = this.$attrs as { class: object }
    const OutlineCls_ = classNames(preCls, `${preCls}--outline`, btnCls, customClass)
    const InnerCls_ = `${preCls}--btn`

    const children = this.$slots.default!()

    return (
      <MRipple>
        <div className={OutlineCls_}>
          <button
            ref={($r) => { this.buttonEle = $r }}
            className={InnerCls_}
            disabled={disabled}
            onClick={onHandleClick}
          >
            <span className={`${preCls}__text`}>{children}</span>
          </button>
        </div>
      </MRipple>
    )
  }
})