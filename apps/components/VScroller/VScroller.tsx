import { MThrottle, __off, __on } from "@k1/utils"
import { PropType, computed, defineComponent, onMounted, onUnmounted, reactive, ref, Ref, h, nextTick, watch } from 'vue'
import Spin from "../Spin/Spin"
// * 虚拟滚动
interface M9VScrollProps {
  // ? 虚拟化时 - 待滚动的目标窗口元素, 函数包裹<调用时才返回, 防止有时会出现元素还没渲染到节点上的异步渲染问题>
  vsElement: () => HTMLElement
  // ? 虚拟化时 - 窗口滚动样式设置
  vsStyle: { x: number, h: number }
  // ? 虚拟滚动的单元高度
  vsUnitHeight: number
  // ? 被虚拟化的原始数据
  data: Array<any>
}
interface M9VScrollState {
  // ? 虚拟化时 - 上极限索引坐标
  topIndex: number
  // ? 虚拟化时 - 下极限索引坐标
  bottomIndex: number
}
// ? 虚拟化时 - 通过上下极限 - 截取的局部数据片段
type M9VSDataT = Array<any>

interface M9VSWindowProps {
  // ? 虚拟化 - 可视窗口宽度
  width: number
  // ? 虚拟化 - 可视窗口高度
  height: number
  // ? 虚拟化 - 可视窗口内 - 单元高度
  unitHeight: number
  // ? 虚拟化 - 全部内容窗口 - 总高度
  totalUnitHeight: number
  // ? 虚拟化 - 可视窗口上下两边留出的多余数据数量 <防止滚动过快出现的上下留白情况, 避免造成不流畅的观感体验>
  restViewLength: number;
  // ? 虚拟化 - 可视窗口最大能承载的数据数量
  dataViewLength: number
  // ? 虚拟化 - 可视窗口对应的 子元素DOM节点本身记录
  __viewportEl: HTMLElement | null,
  // ? 虚拟化 - 全部内容窗口对应的 子元素DOM节点本身记录
  __contentEl: HTMLElement | null
}

export default defineComponent({
  name: 'M9VScroller',
  props: {
    vsElement: {
      type: Function as PropType<M9VScrollProps['vsElement']>,
      default: () => document.createElement('div')
    },
    vsUnitHeight: {
      type: Number as PropType<M9VScrollProps['vsUnitHeight']>,
      default: 30
    },
    vsStyle: {
      type: Object as PropType<M9VScrollProps['vsStyle']>,
      default: () => ({ x: 700, h: 500 })
    },
    loadingStyle: {
      type: Object,
      default: () => ({})
    },
    data: {
      type: Array as PropType<M9VScrollProps['data']>,
      default: () => []
    }
  },
  setup (props, ctx) {
    const { vsElement, vsUnitHeight } = props

    const state = reactive<M9VScrollState>({
      topIndex: 0,
      bottomIndex: 0
    })

    const vsData = computed<M9VSDataT>(() => {
      const _data = props.data
      if (_data.length === 0) { return [] }

      const _sliceVsData = _data.slice(state.topIndex, state.bottomIndex)
      return _sliceVsData
    })

    // * 虚拟滚动条元素 - 为了实现 transform 样式, 避免重复的重排性能消耗, 后续看情况自行实现一个滚动条元素, 强制 transform 进行纵向位移变换
    const vsBarRef: Ref<any> = ref(null)

    const vsWindowRef: Ref<HTMLElement | null> = ref(null)
    const vsContentChildRef: Ref<any> = ref(null)

    function getContentElement () {
      return vsContentChildRef.value.$el || vsContentChildRef.value
    }

    var vsWindow: M9VSWindowProps = {
      width: 0,
      height: 0,
      totalUnitHeight: 0,
      unitHeight: vsUnitHeight,
      restViewLength: 2,
      dataViewLength: 0,
      __viewportEl: null,
      __contentEl: null
    }

    // 监听窗口滚动事件 - 回调计算上下限极限值
    // ! 这里发现 - 虚滚视窗元素 边距改变后, 元素会不停抖动 - 用防抖限制一下

    function onVScroll (e: any) {
      const currentScrollTop = e.target.scrollTop || 0
      
      const { unitHeight, restViewLength, dataViewLength, totalUnitHeight, __contentEl } = vsWindow

      // 计算当前可视窗口 - 滚动到 - 第几个数据索引坐标了 (要向下取值 - 思考下为啥)
      const _currentScrollIndex = Math.floor(currentScrollTop / unitHeight)

      const _topIndex = _currentScrollIndex > restViewLength ? _currentScrollIndex - restViewLength : _currentScrollIndex
      const _bottomIndex = _topIndex + dataViewLength + restViewLength
      
      const vsContentEle = __contentEl!
      // vsContentEle.style.transform = `translateY(${_topIndex * unitHeight}px)`
      vsContentEle.style.setProperty('willChange', 'padding-top padding-bottom')
      vsContentEle.style.paddingTop = `${_topIndex * unitHeight}px`
      vsContentEle.style.paddingBottom = `${totalUnitHeight - _topIndex * unitHeight}px`
      vsContentEle.style.removeProperty('willChange')

      state.topIndex = _topIndex
      state.bottomIndex = _bottomIndex
    }
    // ? 防抖优化 - 防止被监听的虚滚元素 - 可能发生的不断抖动
    const loading = ref(false)
    const _optmizeVScroll = MThrottle(onVScroll, 1000, {
      isDebounce: true,
      onBeforeRun: () => { loading.value = true },
      onAfterRun: () => { loading.value = false }
    })

    // 监听虚滚窗口
    let __global_is_observeVS = false
    function notifyObserveVS () {
      if (__global_is_observeVS) return
      nextTick(() => {
        const _vsWindowEle: HTMLElement = vsElement!()
        vsWindow.width = _vsWindowEle.clientWidth!
        vsWindow.height = _vsWindowEle.clientHeight!
        // vsBarRef.value.style.height = `${_vsWindowEle.offsetHeight}px`
        // ? 用窗口高度 / 单元数据高度 = 得到窗口内部最多承载多少数据个数
        vsWindow.dataViewLength = Math.ceil(vsWindow.height / vsUnitHeight)
        vsWindow.__viewportEl = _vsWindowEle
        fillContentElHeight(props.data.length)
        // ! 虚拟窗口滚动之前, 先自动触发一次 onVScroll监听事件, 否则初次没有数据渲染, 窗口没有子元素撑开, 就没有高度, 滚动不起来
        onVScroll({ target: { scrollTop: 0 } })

        __on(vsWindow.__viewportEl, 'scroll', _optmizeVScroll)

        __global_is_observeVS = true
      })
    }

    // * 虚拟滚动窗口挂载后, 计算窗口高度
    onMounted(() => {
      notifyObserveVS()
    })

    // * 销毁可视窗口的滚动监听事件 - 避免内存长时间占用
    onUnmounted(() => {
      if (__global_is_observeVS) {
        __off(vsWindow.__viewportEl, 'scroll', _optmizeVScroll)
      }
    })

    function fillContentElHeight (dataLength) {
      vsWindow.__contentEl = getContentElement()
      // 计算被滚动的内容区域 - 总高度 = 每行高度 * 数据总行数
      const totalContentHeight = vsUnitHeight * dataLength
      vsWindow.totalUnitHeight = totalContentHeight
      vsWindow.__contentEl!.style.height = `${totalContentHeight}px`
    }

    // 数据源改变时 - 重新为全部内容区容器赋值高度 | 且自动触发一次 虚滚事件更新虚滚数据
    watch(() => props.data.length, (newDataLength) => {
      if (__global_is_observeVS) {
        fillContentElHeight(newDataLength)
        onVScroll({ target: { scrollTop: 0 } })
      }
    })

    return {
      vsData,
      vsBarRef,
      vsWindowRef,
      vsContentChildRef,
      loading,
      notifyObserveVS
    }
  },
  render () {
    const { vsData, loading } = this

    const { loadingStyle, vsElement } = this.$props

    const childrenVNode = this.$slots.default!(vsData)[0]
    
    return (
      <Spin
        style={loadingStyle}
        spinning={loading}
        className="m9-vscroller"
        to={vsElement}
        ref={(_r_: any) => this.vsWindowRef = _r_}
      >
        {h(childrenVNode, { ref: (_childR_: any) => this.vsContentChildRef = _childR_ }, undefined)}
        {/* <div className="m9-vscroller--bar" ref={(_ssr_: any) => this.vsBarRef = _ssr_}></div> */}
      </Spin>
    )
  }
})