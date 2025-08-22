
import MRipple, { MRippleProps } from './MRipple'
import { defineComponent, getCurrentInstance, reactive, h, nextTick, TransitionGroup, onMounted, RendererNode } from 'vue'

type MRippleType = any

function noop() {}

type MouseEventT<M> = any
type UseHTMLEleT<P> = P extends HTMLElement ? P : HTMLElement
type UseHTMLEleAttrsT<Q> = Q extends HTMLElement ? any : unknown

/** @see 波纹容器--元素标签原生_AttibutesProps_定义 */
type rippleSpanWrapHTMLProps<H> =
  | {
      EvReturnT: ReturnType<VoidFunction>
      onMouseDownE: MouseEventT<H>
      onMouseUpE: MouseEventT<H>
      onBubbleE: MouseEventT<H>
      handleMouseClick: (e: MouseEventT<H>) => void
      handleMouseUp: (e: MouseEventT<H>) => void
      onBubble: (e: MouseEventT<H>) => void
    } & UseHTMLEleAttrsT<H>

type RippleCircleAttrsT = {
  size: MRippleProps['size']
  pos: MRippleProps['pos']
}

export default defineComponent({
  name: 'M9RippleWrapper',
  components: { TransitionGroup },
  props: {
    className: {
      type: String,
      default: undefined
    },
    style: {
      type: Object,
      default: undefined
    }
  },
  setup () {
    const vm = getCurrentInstance()
    let _$el: RendererNode | null | undefined = null
    const state = reactive({
      rippleBuffer: [],
      rippleRoundKey: 0
    })

    function createRipple (rippleAttrs: RippleCircleAttrsT): MRippleType {
      const { pos, size } = rippleAttrs
      const MRippleO = <MRipple key={state.rippleRoundKey} pos={pos} size={size} addEndListener={noop} />
      return MRippleO
    }
    function handleMouseClick <Z,>(e: rippleSpanWrapHTMLProps<UseHTMLEleT<Z>>['onMouseDownE']): void {
      e.stopPropagation()
      
      const _rippleCircleAttrs = onBubble(e as any)
      const _newRipple = createRipple(_rippleCircleAttrs)
      
      const _onlyCallBack = () => { handleMouseUp<HTMLSpanElement>(e) }

      state.rippleBuffer = [...state.rippleBuffer, _newRipple] as any
      state.rippleRoundKey = Number(state.rippleRoundKey) + 1

      nextTick(_onlyCallBack)
    }
  
    function handleMouseUp <Y,>(e: rippleSpanWrapHTMLProps<UseHTMLEleT<Y>>['onMouseUpE']): void {
      let _t1: number | null = window.setTimeout(() => {
        onUnBobble()
        if (_t1) {
          window.clearTimeout(_t1)
          _t1 = null
        }
      }, 500)
    }
  
    /**
     * @function onBobble
     * @description 荡漾之初__[观察者--接到管理中心发出的事件通知--提取出波纹圆心与大小属性值]
     * @param e
     * @returns { pos: MRippleProps['pos'], size: MRippleProps['size'] }
     */
    function onBubble <S,>(e: rippleSpanWrapHTMLProps<UseHTMLEleT<S>>['onBubbleE']): RippleCircleAttrsT {
      // 先取出__<[点击处]>__相对于整个页面的绝对位置
      const { clientX, clientY } = e
  
      // 再取出__<[波纹容器]>__相对于整个页面的绝对位置
      const rectProperty = _$el
        ? (_$el as HTMLElement).getBoundingClientRect()
        : {
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            width: 0,
            height: 0
          }
  
      // 相减--求得--波纹距离容器的相对位置--也就是在容器中的圆心坐标
      let _rippleX, _rippleY, _circleW, _circleH, _rippleRadius, _pos
      // 为了完全包裹--波纹外容器, 所绘制的圆类型::外切圆
      if (clientX === 0 && clientY === 0) {
        // ~#__元素被点击的位置, 恰好在页面_<左上角原点处>_
        _rippleX = Math.round(rectProperty['width'] / 2)
        _rippleY = Math.round(rectProperty['height'] / 2)
        _circleW = _rippleX
        _circleH = _rippleY
      } else {
        // ~#__否则, 两个绝对位置相减
        _rippleX = clientX - rectProperty['left']
        _rippleY = clientY - rectProperty['top']
        _circleW = Math.max(Math.abs(_rippleX), Math.abs(clientX - rectProperty['right']))
        _circleH = Math.max(Math.abs(_rippleY), Math.abs(clientY - rectProperty['bottom']))
      }
  
      _rippleRadius = Math.sqrt(Math.pow(_circleW, 2) + Math.pow(_circleH, 2))
      _pos = { x: _rippleX - _rippleRadius, y: _rippleY - _rippleRadius }
      // 计算波纹属性 (#__圆__Attributes)
      const RippleSize = _rippleRadius * 2
      const RippleCircleAttrs = { pos: _pos, size: RippleSize }
      return RippleCircleAttrs
    }
  
    function onUnBobble() {
      // #__移除波纹缓存区中第一个波纹组件, ~~代表波纹的退散
      const { rippleBuffer } = state
      if (!rippleBuffer || !rippleBuffer.length) {
        return void 0
      }
      
      const the_round_RippleBuf = rippleBuffer.slice(1)
      
      nextTick(() => { state.rippleBuffer = the_round_RippleBuf })
      
      return void 0
    }

    onMounted(() => { _$el = vm?.vnode?.el })

    return {
      state,
      createRipple,
      handleMouseUp,
      handleMouseClick
    }
  },
  render () {
    const { state: { rippleBuffer }, handleMouseClick, handleMouseUp } = this
    const children = this.$slots.default!()
    
    const _wrappedChildren = h(children[0], {}, undefined) // style: { overflow: 'hidden' }
    
    return (
      <span
        className='miku-ripple-root'
        onMousedown={(ev) => { handleMouseClick(ev) }}
        onMouseup={(ev) => { handleMouseUp(ev) }}>
        {_wrappedChildren}
        <transition-group name="miku-ripple">
          {rippleBuffer}
        </transition-group>
      </span>
    )
  }
})