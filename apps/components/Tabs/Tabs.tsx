import { PropType, defineComponent, reactive, h, ref, Transition } from "vue";
import { M9TabsProps, M9TabsState } from "./Type";
import Button from "../Button";

export default defineComponent({
  name: 'M9Tabs',
  props: {
    activeKey: {
      type: String as PropType<M9TabsProps['activeKey']>
    }
  },
  emits: ['change', 'update:activeKey'],
  setup (props, ctx) {
    const tabWindowRef = ref()
    const tabWrapperRef = ref()
    const state = reactive<M9TabsState>({ activeKey: '', slideOffsetV: 0 })

    // 翻滚窗口-<前翻|后翻>
    function onPrevOrNextWindow (isPrevOrNextSlide: number) {
      // 翻动限制条件 - 判断前边或者后边是否还有窗口可以翻动
      const tabWrapperWidth = tabWrapperRef.value.offsetWidth
      const tabWindowSize = tabWindowRef.value.offsetWidth
      const tabWrapperSlideOffsetV = state.slideOffsetV
      
      if (isPrevOrNextSlide === 0) {
        // 如果当前 标签容器偏移量 >= 0 => 禁止向前翻滚[即已经到达第一页了]
        if (tabWrapperSlideOffsetV >= 0) {
          return
        }
        // 向前翻滚一个窗口
        const prevSlideOffsetV = Math.abs(tabWrapperSlideOffsetV) > tabWindowSize ? tabWrapperSlideOffsetV + tabWindowSize : 0
        state.slideOffsetV = prevSlideOffsetV
      } else if (isPrevOrNextSlide === 1) {
        // 如果当前 标签容器总宽度 - 标签容器偏移量 < 一个标签可视窗口的宽度 => 禁止向后翻滚[即已经到达最后一页了]
        if (tabWrapperWidth + tabWrapperSlideOffsetV < tabWindowSize) {
          return
        }
        // 向后翻滚一个窗口
        const nextSlideOffsetV = tabWrapperSlideOffsetV - tabWindowSize
        state.slideOffsetV = nextSlideOffsetV
      }
    }

    // 将当前标签 滑动至可视窗口左侧对齐
    function toSlideTabWindow ($tabElement) {
      const { offsetLeft: offsetLtInTabsWrapper } = $tabElement
      const slideOffsetLt = - offsetLtInTabsWrapper
      state.slideOffsetV = slideOffsetLt
    }

    function onChangeTab ($ev: Event) {
      const { dataset: { tabK } } = $ev.target as HTMLElement
      if (!tabK) {
        return void 0
      }
      const willActivingK = tabK
      if (willActivingK === state.activeKey) {
        return
      }
      state.activeKey = willActivingK

      ctx.emit('change', willActivingK)
      ctx.emit('update:activeKey', willActivingK)

      // ! 滑动标签窗口
      // toSlideTabWindow($ev.target)
    }

    return { state, tabWindowRef, tabWrapperRef, onChangeTab, onPrevOrNextWindow }
  },
  render () {
    const { onChangeTab, onPrevOrNextWindow } = this
    const { activeKey, slideOffsetV } = this.state
    const { default: _default } = this.$slots
    const children = _default && _default() || []
    // patchFlag === 64 -> 一个不会改变子节点顺序的 frament 虚拟容器节点
    // patchFlag === 1024 -> 动态 slot 插槽节点
    const TabPanes: any = children[0].patchFlag === 64 ? children[0].children : children[0].patchFlag === 1024 ? children : []

    const tabMetas = TabPanes.map(child => ({ k: child.props?.k, title: child.props?.title }))

    const preCls = 'miku-tabs'

    return (
      <div className={`${preCls}`}>
        <div className={`${preCls}__header`}>
          <Button class={`${preCls}__header--prev`} type="pure" shape="circle" onClick={() => onPrevOrNextWindow(0)}>«</Button>
          <Button class={`${preCls}__header--next`} type="pure" shape="circle" onClick={() => onPrevOrNextWindow(1)}>»</Button>
          <div className={`${preCls}__viewport`} ref={(_r_) => this.tabWindowRef = _r_}>
            <div className={`${preCls}__viewport--wrapper`} ref={(_r2_) => this.tabWrapperRef = _r2_} onClick={onChangeTab} style={{ transform: `translateX(${slideOffsetV}px)` }}>
              { tabMetas.map(eachTabMeta => <div className={`${preCls}__item${activeKey === eachTabMeta.k && ' active' || ''}`} data-tab-k={eachTabMeta.k}>{eachTabMeta.title}</div>) }
            </div>
          </div>
        </div>
        <div className={`${preCls}__content`}>
          { TabPanes.map((EveryTabPane) => <Transition name="tabs-content">{ activeKey === EveryTabPane.props.k && h(EveryTabPane, { ak: activeKey }) }</Transition>) }
        </div>
      </div>
    )
  }
})