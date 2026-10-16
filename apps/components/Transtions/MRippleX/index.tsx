import MRipple, { MRipplePos } from './MRipple'
import { cloneVNode, defineComponent, getCurrentInstance, h, onMounted, onUnmounted, reactive, TransitionGroup, VNode, RendererNode } from 'vue'

type RippleCircleAttrsT = {
  size: number
  pos: MRipplePos
}

/**
 * @description Ripple wrapper: catches mousedown on the wrapped child,
 * spawns self-managed ripple circles (they fade out on their own after
 * `duration`, then emit notifyExited and are removed here by key).
 */
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
      rippleBuffer: [] as VNode[],
      rippleRoundKey: 0
    })

    // Compute the ripple circle attrs (center + circumscribed size)
    function onBubble (e: MouseEvent): RippleCircleAttrsT {
      const { clientX, clientY } = e
      const rectProperty = _$el
        ? (_$el as HTMLElement).getBoundingClientRect()
        : { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 }

      let _rippleX, _rippleY, _circleW, _circleH
      if (clientX === 0 && clientY === 0) {
        _rippleX = Math.round(rectProperty.width / 2)
        _rippleY = Math.round(rectProperty.height / 2)
        _circleW = _rippleX
        _circleH = _rippleY
      } else {
        _rippleX = clientX - rectProperty.left
        _rippleY = clientY - rectProperty.top
        _circleW = Math.max(Math.abs(_rippleX), Math.abs(clientX - rectProperty.right))
        _circleH = Math.max(Math.abs(_rippleY), Math.abs(clientY - rectProperty.bottom))
      }

      const _rippleRadius = Math.sqrt(Math.pow(_circleW, 2) + Math.pow(_circleH, 2))
      return {
        pos: { x: _rippleX - _rippleRadius, y: _rippleY - _rippleRadius },
        size: _rippleRadius * 2
      }
    }

    // Remove the ripple that finished its leave animation, by key
    function onRippleExited ($key: number) {
      state.rippleBuffer = state.rippleBuffer.filter(($_r) => $_r.key !== $key)
    }

    // A ripple asked to be killed - switch its aliveable prop off
    function onRippleKill ($key: number) {
      state.rippleBuffer = state.rippleBuffer.map(($_r) =>
        $_r.key === $key ? cloneVNode($_r, { aliveable: false }) : $_r
      )
    }

    function handleMouseClick (e: MouseEvent): void {
      const { pos, size } = onBubble(e)
      const key = state.rippleRoundKey

      state.rippleBuffer = [
        ...state.rippleBuffer,
        <MRipple
          key={key}
          pos={pos}
          size={size}
          onUpdateAliveable={($_v: boolean) => { if (!$_v) onRippleKill(key) }}
          onNotifyExited={() => onRippleExited(key)} />
      ]
      state.rippleRoundKey = key + 1
    }

    onMounted(() => { _$el = vm?.vnode?.el })

    onUnmounted(() => {
      state.rippleBuffer = []
    })

    return {
      state,
      handleMouseClick
    }
  },
  render () {
    const { state: { rippleBuffer }, handleMouseClick } = this
    const children = this.$slots.default!()

    return (
      <span
        className='miku-ripple-root'
        onMousedown={(ev) => { handleMouseClick(ev) }}>
        {h(children[0], {}, undefined)}
        <transition-group name="miku-ripple">
          {rippleBuffer}
        </transition-group>
      </span>
    )
  }
})