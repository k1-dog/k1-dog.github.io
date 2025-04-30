import classNames from 'classnames'
import { defineComponent, reactive, Transition } from 'vue'

type NumOrStr<ns> = ns

type MRipplePos = { x: NumOrStr<number>; y: NumOrStr<number> }

type MRippleSize = NumOrStr<number>

type MRippleColor = NumOrStr<string>

type MRippleDurT = NumOrStr<number> | undefined

/**
 * @see 美九未来--波纹涟漪--动画元素
 */
export interface MRippleProps {
  /**
   * @see 波纹外部开关
   * @param { boolean } aliveable
   */
  aliveable: boolean

  /**
   * @see 波纹浮现--位置 @description 父元素_[被包裹元素]
   * @param { MRipplePos } pos
   */
  pos: MRipplePos

  /**
   * @see 波纹浮现--大小
   * @param { MRippleSize } size
   */
  size: MRippleSize

  /**
   * @see 波纹涟漪--时长
   */
  duration?: MRippleDurT

  /**
   * @see 波纹--颜色
   */
  color?: MRippleColor

  /**
   * @see 外部样式值
   */
  style?: object

  /**
   * @see 外部类名
   */
  className?: NumOrStr<string>
  addEndListener: () => void
}

interface MRippleState {
  /**
   * @see 波纹产生开关
   */
  rippleExisting: boolean
}

type TransitionStateStyle = {
  entering: object
  entered: object

  exiting: object
  exited: object
  unmounted: object
}

enum DUR {
  timeout = 400
}

export default defineComponent({
  name: 'MRipple',
  props: {
    pos: {
      type: Object,
      default: {}
    },
    size: {
      type: [String, Number],
      default: 100
    },
    duration: {
      type: Number,
      default: DUR.timeout
    },
    color: {
      type: String,
      default: 'gray'
    },
    style: {
      type: Object,
      default: {}
    },
    className: {
      type: String,
      default: ''
    },
    addEndListener: {
      type: Function,
      default: () => {}
    }
  },
  setup () {
    const state = reactive({ rippleExisting: true })
    /**
     * @see 波纹动画时长::0.7799\(S)
     */
    const defaultDuration: number = DUR.timeout

    // enter2exit_timer = null || undefined

    /** @see <-fn(node,_isAppearing)-> */
  function handleEntered () {
    const timeout = defaultDuration
    let _t: number | null | undefined = window.setTimeout(() => {
      window.clearTimeout(_t!)
      _t = null || undefined
      killRipple()
    }, timeout)
  }

  function handleExited() {
    // const a = ReactDOM.unmountComponentAtNode(node)
  }

  function killRipple() {
    state.rippleExisting = false
  }

    return {
      state,
      handleExited, handleEntered
    }
  },
  render (_this) {
    const { state: { rippleExisting }, handleEntered, handleExited } = this
    
    const { pos, size, style = {}, className = '', ...other } = this.$props

    const rippleClass = classNames('miku-ripple-baseStyle')

    // 使用~#__Transition-Group__动画状态机管理时, 每个Transition的in状态会自动切换, 无需主动控制
    // 好像 Vue3里的内置 transition 动画组件还不错, 使用简单, 上层包裹一个transition-group以后就不用管被包裹元素的动画控制了
    return (
      <span
        className={rippleClass}
        style={{
          width: size + 'px',
          height: size + 'px',
          top: pos['y'] + 'px',
          left: pos['x'] + 'px'
        }} />
      // <Transition name={rippleClass}>
      // </Transition>
    )
  }
})