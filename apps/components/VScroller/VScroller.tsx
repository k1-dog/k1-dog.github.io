import { MThrottle, __off, __on } from "@k1/utils"
import { PropType, computed, defineComponent, onMounted, onUnmounted, reactive, ref, Ref, nextTick, watch, cloneVNode } from 'vue'
import Spin from "../Spin/Spin"
// * 虚拟滚动
interface M9VScrollProps {
  // ? 虚拟化时 - 窗口滚动样式设置
  vsStyle: { x: number, h: number }
  // ? 虚拟滚动的单元高度
  vsUnitHeight: number
  // ? 被虚拟化的原始数据
  data: Array<any>
  // ? 外滚模式 - 外部滚动容器(如 Table viewport); 不传则自滚模式(自身 overflow-y: auto 滚动)
  vsTarget?: () => HTMLElement
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
  // ? 虚拟化 - 实际承载滚动监听事件的元素记录 <自滚=自身 | 外滚=vsTarget容器>
  __viewportEl: HTMLElement | null
  // ? 外滚模式 - 虚拟内容区在外部滚动容器内的纵向偏移量(如被表头 sticky 占据的高度), 滚动计算时需扣除
  dataOffset: number
}

export default defineComponent({
  name: 'M9VScroller',
  props: {
    vsUnitHeight: {
      type: Number as PropType<M9VScrollProps['vsUnitHeight']>,
      default: 30
    },
    vsStyle: {
      type: Object as PropType<M9VScrollProps['vsStyle']>,
      // h > 0 means fixed inline height/width (Table); h = 0 means inherit parent via CSS height: 100% (Select)
      default: () => ({ x: 0, h: 0 })
    },
    loadingStyle: {
      type: Object,
      default: () => ({})
    },
    data: {
      type: Array as PropType<M9VScrollProps['data']>,
      default: () => []
    },
    vsTarget: {
      type: Function as PropType<M9VScrollProps['vsTarget']>,
      default: undefined
    }
  },
  setup(props, ctx) {
    const { vsUnitHeight } = props
    // 外滚模式: 滚动容器为外部元素(vsTarget), 自身只撑高不滚动;
    // 自滚模式: 自身 overflow-y: auto 滚动并自测量高度 (Select 等)
    const isOuterMode = () => !!props.vsTarget

    const state = reactive<M9VScrollState>({
      topIndex: 0,
      bottomIndex: 0
    })

    const vsData = computed<M9VSDataT>(() => {
      const data = props.data
      if (data.length === 0) { return [] }

      const sliceVsData = data.slice(state.topIndex, state.bottomIndex)
      return sliceVsData
    })

    // * 虚拟滚动条元素 - 自滚模式: absolute 溢出扩展自身 scrollHeight; 外滚模式: static 回文档流撑高自身容器, 顶起外层滚动容器 scrollHeight
    const vsBarRef: Ref<any> = ref(null)

    const vsWindowRef: Ref<HTMLElement | null> = ref(null)

    var vsWindow: M9VSWindowProps = {
      width: 0,
      height: 0,
      totalUnitHeight: 0,
      unitHeight: vsUnitHeight,
      restViewLength: 2,
      dataViewLength: 0,
      __viewportEl: null,
      dataOffset: 0
    }

    // 监听窗口滚动事件 - 回调计算上下限极限值
    // ! 这里发现 - 虚滚视窗元素 边距改变后, 元素会不停抖动 - 用防抖限制一下

    function onVScroll($e: any) {
      const { unitHeight, totalUnitHeight, restViewLength, dataViewLength, dataOffset } = vsWindow

      // 外滚模式: 外部容器 scrollTop 可能包含内容区之前的偏移(如表头), 需扣除
      const rawScrollTop = ($e.target.scrollTop || 0) - dataOffset
      const currentScrollTop = Math.min(totalUnitHeight, Math.max(0, rawScrollTop))
      // 计算当前可视窗口 - 滚动到 - 第几个数据索引坐标了 <要~~向上~~取值 - 思考下为啥>a
      const currentScrollIndex = Math.ceil(currentScrollTop / unitHeight)

      // 底部 clamp 保护: 滚动到底时 scrollTop 抖动不会让 topIndex 越出数据范围
      const topIndex = Math.min(currentScrollIndex, props.data.length)
      const bottomIndex = topIndex + dataViewLength + restViewLength

      state.topIndex = topIndex
      state.bottomIndex = bottomIndex
    }
    // ? 防抖优化 - 防止被监听的虚滚元素 - 可能发生的不断抖动
    const loading = ref(false)
    const optmizeVScroll = MThrottle(onVScroll, 1000, {
      isDebounce: true,
      onBeforeRun: () => { loading.value = true },
      onAfterRun: () => { loading.value = false }
    })

    // * 滚动事件入口 wrapper - 外滚模式下外部容器横向滚动也会触发 scroll 事件
    // ! 跳过判断必须放在 MThrottle 外层: 包装函数一旦执行, loading 钩子与防抖计时器都会启动, 即使内部 return 也白搭
    let __lastScrollTop = -1
    function onViewportScroll($e: any) {
      const scrollTop = $e.target.scrollTop || 0
      // 纯横向滚动 (scrollTop 未变化) -> 直接跳过, 不触发 loading, 不启动防抖计时器
      if (scrollTop === __lastScrollTop) return
      __lastScrollTop = scrollTop
      optmizeVScroll($e)
    }

    // 监听虚滚窗口 - 自滚: 直接度量自身元素; 外滚: 度量外部滚动容器
    let __global_is_observeVS = false
    function notifyObserveVS() {
      nextTick(() => {
        const outerViewportWin = props.vsTarget?.()
        const vsWindowEle: HTMLElement | null = outerViewportWin ?? vsWindowRef.value
        if (!vsWindowEle) return

        let _measuredHeight: number
        if (isOuterMode()) {
          // 外滚模式 - 可视高直接用 vsStyle.h; 宽度取外部容器真实宽度
          const measuredWidth = vsWindowEle.clientWidth
          if (measuredWidth <= 0) return
          vsWindow.width = measuredWidth
          _measuredHeight = props.vsStyle.h
          // 虚拟内容区在外部滚动容器内的静态纵向偏移(如 sticky 表头占据的高度)
          // 用 offsetTop 而非 getBoundingClientRect: 后者随 scrollTop 变化会失真
          vsWindow.dataOffset = vsWindowRef.value ? vsWindowRef.value.offsetTop : 0
        } else {
          // 自滚模式 - 跳过不可见时 (如 Select 面板 Expand display:none)
          _measuredHeight = vsWindowEle.clientHeight
          if (_measuredHeight <= 0) return
          vsWindow.width = vsWindowEle.clientWidth
          vsWindow.dataOffset = 0
        }
        vsWindow.height = _measuredHeight
        // ? 用窗口高度 / 单元数据高度 = 得到窗口内部最多承载多少数据个数
        vsWindow.dataViewLength = Math.ceil(vsWindow.height / vsUnitHeight)
        vsWindow.__viewportEl = vsWindowEle

        fillContentElHeight(props.data.length)
        // 按当前真实滚动偏移同步一次虚拟数据切片
        onVScroll({ target: { scrollTop: vsWindowEle.scrollTop || 0 } })

        // 滚动监听事件只绑定一次
        if (!__global_is_observeVS) {
          __on(vsWindowEle, 'scroll', onViewportScroll)
          __global_is_observeVS = true
        }
      })
    }

    // * 虚拟滚动窗口挂载后, 计算窗口高度
    onMounted(() => {
      notifyObserveVS()
    })

    // * 销毁可视窗口的滚动监听事件 - 避免内存长时间占用
    onUnmounted(() => {
      if (__global_is_observeVS) {
        __off(vsWindow.__viewportEl, 'scroll', onViewportScroll)
      }
    })

    function fillContentElHeight($dataLength) {
      // Total height of the full virtual content: unit height * data count
      const totalContentHeight = vsUnitHeight * $dataLength
      vsWindow.totalUnitHeight = totalContentHeight
    }

    // 数据源改变时 - 重新为全部内容区容器赋值高度 | 且自动触发一次 虚滚事件更新虚滚数据
    watch(() => props.data.length, ($newDataLength) => {
      if (__global_is_observeVS) {
        fillContentElHeight($newDataLength)
        onVScroll({ target: { scrollTop: 0 } })
      }
    })

    return {
      state,
      vsData,
      vsBarRef,
      vsWindow,
      vsWindowRef,
      loading,
      notifyObserveVS,
      isOuterMode
    }
  },
  render() {
    const { state, vsData, loading, vsWindow, isOuterMode } = this

    const { loadingStyle, vsStyle, vsTarget } = this.$props

    const isOuter = isOuterMode()

    const childrenVNode = this.$slots.default!(vsData)[0]

    // 外滚: 撑高唯一归 m9-vscroller__bar(static 回流到文档流); root 高度由 bar 决定, 自身不再撑高;
    //       遮罩 sticky 占位由 scss 负 margin 抵消(否则 scrollHeight 虚长一屏)
    // 自滚: h > 0 内联固定高(Table 场景), h = 0 走 CSS height: 100% 继承父容器(Select 场景)
    const vsRootStyle = isOuter
      ? { width: `${vsStyle.x}px` }
      : vsStyle.h > 0
        ? { width: `${vsStyle.x}px`, height: `${vsStyle.h}px` }
        : undefined

    // Inject virtual positioning styles directly into the slot root node, no extra wrapper div.
    // clip-path inset(0): rendered rows must never expand scrollHeight of the scroll container
    // (otherwise the bottom edge keeps growing with topIndex, creating an endless scroll loop).
    // NOTE: overflow:hidden would become the nearest non-visible-overflow ancestor for sticky
    // fixed cells (tbody cells), breaking their freeze anchoring — clip-path clips without
    // creating a scroll container, keeping position:sticky anchored to the outer viewport.
    const contentVNode = childrenVNode
      ? cloneVNode(childrenVNode, {
        style: {
          position: 'absolute',
          top: '0px',
          left: '0px',
          width: '100%',
          height: `${vsWindow.height}px`,
          clipPath: 'inset(0)',
          transform: `translateY(${state.topIndex * vsWindow.unitHeight}px)`
        }
      })
      : null

    // 外滚模式: 遮罩尺寸由 CSS 变量控制(= 外部容器可视宽 × 可视高), 不随撑高层膨胀
    const vsRootCls = isOuter ? 'm9-vscroller m9-vscroller__outer' : 'm9-vscroller'
    const vsRootStyle_ = isOuter
      ? { ...vsRootStyle, '--vs-w': `${vsWindow.width}px`, '--vs-h': `${vsWindow.height}px` }
      : vsRootStyle

    return (
      <div className={vsRootCls} style={vsRootStyle_} ref={($_r_: any) => this.vsWindowRef = $_r_}>
        <Spin
          style={loadingStyle}
          spinning={loading}
          to={vsTarget || (() => this.vsWindowRef)}
        >
          {contentVNode}
        </Spin>
        <div
          className={isOuter ? 'm9-vscroller__bar m9-vscroller__bar--outer' : 'm9-vscroller__bar'}
          style={{ height: `${vsWindow.totalUnitHeight + vsWindow.restViewLength * vsWindow.unitHeight}px` }}
          ref={($_ssr_: any) => this.vsBarRef = $_ssr_}
        ></div>
      </div>
    )
  }
})