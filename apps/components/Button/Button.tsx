import classNames from 'classnames'
import MTransition from '../Transtions'
import { PropType, defineComponent } from 'vue'

const MRipple = MTransition.MRipple

export interface ButtonHandleClick {
  <E3, R>(e?: E3, ...restArgs: R[]): any
}

export type btnTypes = 'main' | 'pure' | 'danger' | 'mirai' | 'k1'
export type sizeTypes = 'small' | 'medium' | 'large'
export type shapeTypes = 'circle' | 'square'

export interface ButtonProps {
  /**
   * @param {string | undefined} type <按钮类型>
   */
  type?: btnTypes

  /**
   * @param {string | undefined} shape <按钮形状>
   */
  shape?: shapeTypes

  /**
   * @param {string | undefined} size <按钮大小>
   */
  size?: sizeTypes

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

export default defineComponent({
  name: "M9Button",
  props: {
    type: {
      type: String as PropType<ButtonProps['type']>,
      default: 'main'
    },
    shape: {
      type: String as PropType<ButtonProps['shape']>,
      default: 'square'
    },
    size: {
      type: String as PropType<ButtonProps['size']>,
      default: 'medium'
    },
    disabled: {
      type: Boolean as PropType<ButtonProps['disabled']>,
      default: false
    },
    loading: {
      type: Boolean as PropType<ButtonProps['loading']>,
      default: false
    }
  },
  setup (props, ctx) {
    const buttonEle: HTMLButtonElement | null = null
    const onHandleClick: Function = ($e: PointerEvent) => {
      // 不加这行阻止冒泡的话, 这个按钮点击事件会连续触发两次
      // 奇怪的是 并不是这里的点击事件触发两次, 而是外部监听这个点击事件的回调事件会连续两次执行, 搞不懂
      $e && $e.stopPropagation()

      // console.log('🚀 ~ Button::setup ~ e:', e)
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