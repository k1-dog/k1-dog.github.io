import { DateInputT, DateBaseProps } from './index'
import { PropType, Ref, VNode, defineComponent, onMounted, ref } from 'vue';

interface MikuDateHeadProps extends DateBaseProps {
  notifyUpdate: (updateDate: DateBaseProps) => void
}

interface MikuDateHeadState extends DateBaseProps {

  subYear (Year: DateInputT): DateInputT;

  subMonth (Month: DateInputT): DateInputT;

  addYear (Year: DateInputT): DateInputT;

  addMonth (Month: DateInputT): DateInputT;
}

const MDateHeadPreCls = 'miku-date-head'
const MDateHead3Mouse = 'mouse-123'
const MDateHeadViewPreCls = `${MDateHeadPreCls}__view`
const MDateHeadLtPreCls = `${MDateHeadPreCls}__view-left`
const MDateHeadMidPreCls = `${MDateHeadPreCls}__view-middle`
const MDateHeadRtPreCls = `${MDateHeadPreCls}__view-right`

type MikuDateHeadArrowT = { MY: DateInputT, MM: DateInputT }

/** @see 美九时间头部容器组件__派遣左箭头间谍记录需要~de~敌方关键信息并实时[根据设置的依赖属性]反馈报告给__MikuDateHead */
// 此乃按需引用子组件当中的方法或属性 -- 不会直接引用组件本身
interface MikuDateHeadSpyL {
  current: MikuDateHeadSpyL;
  subYear () : void;
  subMonth () : void;
}

// SFC -> 日期头部 - 左划箭头
const MDateHeadLeft = function (props) {
  // 设置 父类组件 & 左箭头组件 通信监视哨兵 -> 进行通信
  const { MY, MM } = props
  return (
    <div className={MDateHeadLtPreCls}>
      <a data-dh="lt-Y" title={`${MY}-${MM}`}>&lt; </a><span>❀❀</span>
    </div>
  )
}

interface MikuDateHeadSpyR {
  current: MikuDateHeadSpyR;
  addYear () : void;
  addMonth () : void;
}

// SFC -> 日期头部 - 右划箭头
const MDateHeadRight = function (props) {
  // 设置 父类组件 & 右箭头组件 通信监视哨兵 -> 进行通信
  const { MY, MM } = props
  return (
    <div className={MDateHeadRtPreCls}>
      <span>❀❀</span><a data-dh="rt-Y" title={`${MY}-${MM}`}> &gt;</a>
    </div>
  )
}

type MikuDateHeadMidT = DateBaseProps

const MDateHeadMid = function (props) {
  // 纯函数组件 ~ 解构 -> 年 | 月 | 日 <-
  const { MD, MM, MY } = props
  return (
    <div className={MDateHeadMidPreCls} data-dh="mid">
      { `___  ${MY}年 ${MM}月 ${MD}日  ___` }
    </div>
  )
}

type ArrowT = 'lt-Y' | 'mid' | 'rt-Y' | 'lt-M' | 'rt-M'

export type _DateHeadType = any

export default defineComponent({
  name: 'M9DateHeader',
  props: {
    MY: {
      type: Object as PropType<MikuDateHeadProps['MY']>
    },
    MM: {
      type: Object as PropType<MikuDateHeadProps['MM']>
    },
    MD: {
      type: Object as PropType<MikuDateHeadProps['MD']>
    }
  },
  emits: ['notifyUpdate'],
  setup (props, ctx) {
    const dhRef = ref<any>()

    onMounted(() => {
      const this$EL: HTMLDivElement =  dhRef.value
      const MouseEL = this$EL.getElementsByClassName(MDateHead3Mouse)[0] as HTMLDivElement
      const iH_ = window.getComputedStyle(MouseEL, '::before').getPropertyValue('height')
      const iW01_ = parseInt(window.getComputedStyle(MouseEL, '::before').getPropertyValue('width'))
      const iW02_ = parseInt(window.getComputedStyle(MouseEL, '::after').getPropertyValue('width'))
      MouseEL.style.width = `${iW01_ + iW02_ + iW01_}px`
      MouseEL.style.height = iH_
    })

    function subYear ($Year: DateInputT) {
      // this.setState({
      //   ...this.state,
      //   MY: Year - 1
      // })
    }

    function subMonth ($Month: DateInputT) {
      // # const now = mode === 'Day' ? { MY: selectDate.year(), MM: selectDate.month() + 1, MD: selectDate.date() } : { MY: selectDate.year(), MM: selectDate.month() + 1, MD }
      const now = { MY: props.MY, MM: $Month - 1, MD: props.MD }
      ctx.emit('notifyUpdate', now)
      // this.setState({
      //   ...this.state,
      //   MM: Month - 1
      // })
    }

    function addYear ($Year: DateInputT) {
      // this.setState({
      //   ...this.state,
      //   MY: Year + 1
      // })
    }

    function addMonth ($Month: DateInputT) {
      const now = { MY: props.MY, MM: $Month + 1, MD: props.MD }
      ctx.emit('notifyUpdate', now)
      // this.setState({
      //   ...this.state,
      //   MM: Month + 1
      // })
    }

    function dispatchArrowHandler ($dh: ArrowT) {
      const { MY, MM } = props
      if (!MY || !MM) {
        return
      }
      switch ($dh) {
        case 'lt-Y':
          subYear(MY)
          break
        case 'rt-Y':
          addYear(MY)
          break
        case 'lt-M':
          subMonth(MM)
          break
        case 'rt-M':
          addMonth(MM)
          break
        default:
          break
      }
    }

    function onArrow ($e: Event) {
      $e.stopPropagation()

      const target = $e.currentTarget as any
      console.log('🚀 ~ MikuDateHead ~ onArrow ~ _target:', target)
      if (!target.dataset.dh) { return void 0 }
      const arrowType = target.dataset.dh
      dispatchArrowHandler(arrowType)

      return void 0
    }

    return { onArrow, dhRef}
  },
  render () {
    const { onArrow } = this
    const { MY, MM } = this.$props
    const compos: [
      VNode<MikuDateHeadArrowT>,
      VNode<MikuDateHeadMidT>,
      VNode<MikuDateHeadArrowT>,
    ] = [
      <MDateHeadLeft key='miku-date-head-lt' MY={MY} MM={MM}></MDateHeadLeft>,
      <MDateHeadRight key='miku-date-head-rt' MY={MY} MM={MM}></MDateHeadRight>,
      <MDateHeadMid key='miku-date-head-mid' {...this.$props}></MDateHeadMid>
      // 必须将两个浮动元素往前边放置, 才能布局正常 -- 这个有待考量
    ]
    // const headPreCls = classNames(MDateHeadPreCls, MDateHead3Mouse)
    return (
      <div className={MDateHeadPreCls} ref={($dhRef: any) => this.dhRef = $dhRef}>
        <div className={MDateHead3Mouse}/>
        <div className={MDateHeadViewPreCls}  onClick={onArrow}>
        { compos }
        </div>
      </div>
    )
  }
})