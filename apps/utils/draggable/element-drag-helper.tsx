import classNames from 'classnames'
import { defineComponent, createApp, computed, reactive, PropType, onMounted, onUnmounted } from "vue"

const M9DragHelperComponent = defineComponent({
  name: 'M9DragHelper',
  props: {
    root: {
      type: Object as PropType<Element | null>,
      default: () => null
    },
    // ? 定义 提示线的方向设置 - 是水平线还是垂直线, 默认是 'y' 型垂直线
    direction: {
      type: String as PropType<'x' | 'y'>,
      default: 'y'
    }
  },
  setup (props) {
    const state = reactive({ direction: 'y', x: 0, y: 0, opacity: 0 })

    const positionStyle = computed(() => {
      const offsetX = document.documentElement.scrollLeft
      const offsetY = document.documentElement.scrollTop
      const transformY = state.direction === 'x' ? `translateY(${state.y}px)` : `translateY(0)`
      const transformX = state.direction === 'y' ? `translateX(${state.x}px)` : `translateX(0)`
      return {
        transform: `${transformX} ${transformY}`,
        opacity: state.opacity,
        top: `${offsetY}px`,
        left: `${offsetX}px`
      }
    })

    function onChangePosition (newPosition = { x: 0, y: 0, opacity: 0 }) {
      state.x = newPosition.x
      state.y = newPosition.y
      state.opacity = newPosition.opacity
    }

    function onChangeDirection ($direction = 'y') {
      state.direction = $direction
    }

    onMounted(() => {
      if (props.root) document.body.appendChild(props.root)
    })

    onUnmounted(() => {
      if (props.root) props.root.parentNode?.removeChild(props.root)
    })

    return { state, positionStyle, onChangePosition, onChangeDirection }
  },
  render () {
    const { direction } = this.state
    const dragHelperCls = classNames("m9-drag-helper", { 'x': direction === 'x', 'y': direction === 'y' })
    return <div className={dragHelperCls} style={this.positionStyle}></div>
  }
})

// ? 单例模式 - 全系统仅提供一个 拖拽-helper 提示线元素, 最大程度节省性能

function M9DragHelperCtor () {
  // ! 闭包定义变量名 - 防止全部变量污染
  // ! 为了实现 createApp().mount() 形式的单例组件模式, 我们记录一个该单实例组件需要的容器元素,
  // ! 然后 createApp 初始化单实例时, 在beforeMount周期内, 自动创建该div容器元素, 后边才能正常 mount 挂载
  // var helper_div_root: HTMLDivElement = document.createElement('div')
  // ! 这里试着用 createApp 创造一个 dragHelper 组件唯一实例, 然后 mount "#app" 挂载报错, 提示已经有一个实例挂载到 #app下边了 ...
  var one_m9DragHelper
  return (props, helper_div_root: HTMLDivElement = document.createElement('div')) => one_m9DragHelper = one_m9DragHelper || createApp(M9DragHelperComponent, {
    root: helper_div_root,
    direction: props.direction
  }).mount(helper_div_root)
}
export default M9DragHelperCtor()