import { ref, Ref, defineComponent, onMounted, h, watch } from "vue";
import className from 'classnames'

export type sizeTypes = 'small' | 'medium' | 'large'

export interface MSpinProps {
  /**
   * @spinning 加载 指定是否为加载状态， 默认为加载中
   * */
  spinning: boolean | undefined
  /**
   * @size 组件大小，可选值为 small default， large，默认为default
   */
  size?: sizeTypes
  /**
   * @context 加载显示的内容
   * */
  context?: string
}

export default defineComponent({
  name: 'M9Spin',
  props: {
    spinning: {
      type: Boolean,
      default: true
    },
    // 特殊情况下 - loading过渡组件并不是对子元素直接覆盖, 而是需要对一个毫无层级关联的元素进行覆盖, 那就手动传递过来那个元素
    to: {
      type: Function,
      default: () => undefined
    },
    size: {
      type: String,
      default: 'medium'
    },
    text: {
      type: String,
      default: '加载中'
    }
  },
  setup(props, ctx) {
    const SpinRef: Ref<any> = ref(null)
    const SpinLoadingRef: Ref<any> = ref(null)
    const SpinTextRef: Ref<any> = ref(null)
    const SpinInnerRef: Ref<any> = ref(null)

    function walkFindPositionParent($element: HTMLElement) {
      let _parentNode = $element.parentElement
      while (_parentNode !== document.documentElement && _parentNode) {
        if (_parentNode.style['position']) {
          const pos = _parentNode.style['position']
          if (pos === 'relative' || pos === 'absolute') {
            break
          }
        }
        _parentNode = _parentNode.parentElement
      }

      return _parentNode
    }

    function loadingEffect() {
      let _innerHeight, _innerWidth, _innerZIndex, _left, _top
      const specifyEl: undefined | HTMLElement = props.to?.()
      const childrenEl = specifyEl || SpinInnerRef.value.$ && SpinInnerRef.value.$.vnode.el || SpinInnerRef.value
      if (childrenEl) {
        const { width, height, left, top } = childrenEl.getBoundingClientRect()
        _innerWidth = width
        if (childrenEl.scrollHeight > childrenEl.clientHeight) {
          _innerWidth -= 17
        }
        _innerHeight = height
        if (childrenEl.scrollWidth > childrenEl.clientWidth) {
          _innerHeight -= 17
        }
        _innerZIndex = childrenEl.style.zIndex || 0
        _left = left
        _top = top
      }

      SpinLoadingRef.value.style.zIndex = _innerZIndex + 2
      // Loading ball size is capped with min() in Spin.scss (auto-adaptive within bounds),
      // no JS-driven width growing with the masked container (infinite inflation bug)

      SpinTextRef.value.style.zIndex = _innerZIndex + 4

      const parentNode = walkFindPositionParent(childrenEl)
      const { left: pLeft, top: pTop } = parentNode?.getBoundingClientRect()!

      SpinRef.value.style.zIndex = _innerZIndex + 1
      SpinRef.value.style.top = `${_top - pTop}px`
      SpinRef.value.style.left = `${_left - pLeft}px`
      SpinRef.value.style.width = `${_innerWidth}px`
      SpinRef.value.style.height = `${_innerHeight}px`
    }

    onMounted(() => {
      if (props.spinning) {
        loadingEffect()
      }
    })

    watch(() => props.spinning, ($isLoading) => {
      if ($isLoading && SpinInnerRef.value) {
        loadingEffect()
      }
    })

    return {
      SpinRef, SpinLoadingRef, SpinTextRef, SpinInnerRef
    }
  },
  render() {
    const {
      $props: { spinning, text },
      $attrs: { style = {} }
    } = this

    const childrenVNode = this.$slots.default!()

    const baseSpinCls = 'miku-spin'

    const spin_cls = className(baseSpinCls) //遮罩层

    return (
      <>
        {
          <div v-show={spinning} ref={($_r_: any) => this.SpinRef = $_r_} className={spin_cls} style={style}>
            <div ref={($_spinLoadingRef_: any) => this.SpinLoadingRef = $_spinLoadingRef_} className={`${spin_cls}__loading`}>
              <div className={`${spin_cls}__loading--ball`}></div>
            </div>
            <div ref={($_spinTextRef_: any) => this.SpinTextRef = $_spinTextRef_} className={`${spin_cls}__text`}>{text}</div>
          </div>
        }
        {h(childrenVNode[0], { ref: ($_r_: any) => this.SpinInnerRef = $_r_ }, undefined)}
      </>
    )
  }
})