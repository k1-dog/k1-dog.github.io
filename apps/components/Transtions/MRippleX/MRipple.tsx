import { defineComponent, onUnmounted, Transition } from 'vue'

export interface MRipplePos {
  x: number
  y: number
}

export interface MRippleProps {
  /** Ripple alive switch - the ripple fades out once it turns false */
  aliveable: boolean
  /** Ripple center position relative to the wrapper element */
  pos: MRipplePos
  /** Ripple diameter */
  size: number
  /** How long the ripple stays alive after fully entered */
  duration?: number
  /** Extra end-condition listener hook */
  addEndListener?: () => void
}

const DUR = { timeout: 400 }

/**
 * @description Self-managed ripple circle.
 *
 * Lifecycle: enter animation -> handleEntered (alive for `duration`)
 * -> killRipple (emits update:aliveable false) -> leave animation
 * -> handleExited (emits notifyExited, the parent removes it by key).
 */
export default defineComponent({
  name: 'MRipple',
  props: {
    aliveable: {
      type: Boolean,
      default: true
    },
    pos: {
      type: Object,
      default: () => ({})
    },
    size: {
      type: Number,
      default: 100
    },
    duration: {
      type: Number,
      default: DUR.timeout
    },
    addEndListener: {
      type: Function,
      default: () => void 0
    }
  },
  emits: ['update:aliveable', 'notifyExited'],
  setup (props, { emit }) {
    let _killTimer: number | null = null

    // Fully entered -> stay alive for `duration`, then kill
    function handleEntered () {
      _killTimer = window.setTimeout(() => {
        _killTimer = null
        killRipple()
      }, props.duration)
    }

    // Ask the parent to switch aliveable off (one-way data flow)
    function killRipple () {
      if (_killTimer !== null) {
        window.clearTimeout(_killTimer)
        _killTimer = null
      }
      emit('update:aliveable', false)
    }

    // Leave animation done -> the parent removes this ripple
    function handleExited () {
      emit('notifyExited')
    }

    onUnmounted(() => {
      if (_killTimer !== null) {
        window.clearTimeout(_killTimer)
        _killTimer = null
      }
    })

    return {
      handleEntered,
      handleExited
    }
  },
  render () {
    const { pos, size } = this.$props

    return (
      <Transition
        name="miku-ripple"
        appear
        onAfterEnter={this.handleEntered}
        onAfterLeave={this.handleExited}>
        <span
          v-show={this.aliveable}
          className="miku-ripple-baseStyle"
          style={{
            width: size + 'px',
            height: size + 'px',
            top: pos.y + 'px',
            left: pos.x + 'px'
          }}
        />
      </Transition>
    )
  }
})