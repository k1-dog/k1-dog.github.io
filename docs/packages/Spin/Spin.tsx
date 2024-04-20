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

export default defineComponent ({
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
  setup (props, ctx) {
    const SpinRef: Ref<any> = ref(null)
    const SpinLoadingRef: Ref<any> = ref(null)
    const SpinTextRef: Ref<any> = ref(null)
    const SpinInnerRef: Ref<any> = ref(null)

    function walkFindPositionParent (element: HTMLElement) {
      let parentNode = element.parentElement
      while (parentNode !== document.documentElement && parentNode) {
        if (parentNode.style['position']) {
          const pos = parentNode.style['position']
          if (pos === 'relative' || pos === 'absolute') {
            break
          }
        }
        parentNode = parentNode.parentElement
      }

      return parentNode
    }

    function loadingEffect () {
      let innerHeight, innerWidth, innerZIndex, _left, _top
      const specifyEl: undefined | HTMLElement = props.to?.()
      const _childrenEl = specifyEl || SpinInnerRef.value.$ && SpinInnerRef.value.$.vnode.el || SpinInnerRef.value
      if (_childrenEl) {
        const { width, height, left, top } = _childrenEl.getBoundingClientRect()
        innerWidth = width
        if (_childrenEl.scrollHeight > _childrenEl.clientHeight) {
          innerWidth -= 17
        }
        innerHeight = height
        if (_childrenEl.scrollWidth > _childrenEl.clientWidth) {
          innerHeight -= 17
        }
        innerZIndex = _childrenEl.style.zIndex || 0
        _left = left
        _top = top
      }
      
      SpinLoadingRef.value.style.zIndex = innerZIndex + 2
      SpinLoadingRef.value.style.width = `${Math.floor(innerWidth * 0.4)}px`
      SpinLoadingRef.value.style.height = SpinLoadingRef.value.style.width

      SpinTextRef.value.style.zIndex = innerZIndex + 4

      const parentNode = walkFindPositionParent(_childrenEl)
      const { left: pLeft, top: pTop } = parentNode?.getBoundingClientRect()!

      SpinRef.value.style.zIndex = innerZIndex + 1
      SpinRef.value.style.top = `${_top - pTop}px`
      SpinRef.value.style.left = `${_left - pLeft}px`
      SpinRef.value.style.width = `${innerWidth}px`
      SpinRef.value.style.height = `${innerHeight}px`
    }

    onMounted(() => {
      if (props.spinning) {
        loadingEffect()
      }
    })

    watch(() => props.spinning, (isLoading) => {
      if (isLoading && SpinInnerRef.value) {
        loadingEffect()
      }
    })
    
    return {
      SpinRef, SpinLoadingRef, SpinTextRef, SpinInnerRef
    }
  },
  render() {
    const {
      $props: { spinning, text }
    } = this

    const childrenVNode = this.$slots.default!()

    const baseSpinCls = 'miku-spin'

    const spin_cls = className(baseSpinCls) //遮罩层

    return (
      <>
        {
          <div v-show={spinning} ref={(_r_: any) => this.SpinRef = _r_} className={spin_cls}>
            <div ref={(_spinLoadingRef_: any) => this.SpinLoadingRef = _spinLoadingRef_} className={`${spin_cls}__loading`}>
              <div className={`${spin_cls}__loading--ball`}></div>
            </div>
            <div ref={(_spinTextRef_: any) => this.SpinTextRef = _spinTextRef_} className={`${spin_cls}__text`}>{text}</div>
          </div>
        }
        { h(childrenVNode[0], { ref: (_r_: any) => this.SpinInnerRef = _r_}, undefined) }
      </>
    )
  } 
})