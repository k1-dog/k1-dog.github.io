import dayjs from 'dayjs'
import Input from '../Input/Input'
import Popover from '../Popover/Popover'
import M9Icon from '@k1/styles/assets/_'
import DateHead, { _DateHeadType as DHType } from './DatePickHeader'
import DateBody, { _DateBodyType as DBType } from './DatePickBodier'
import DateFoot, { _DateFootType as DFType } from './DatePickFooter'
import { DateBaseProps, DateInputT, DateOutputT, DateNow, MikuDatePreCls } from './index'
import { PropType, VNode, defineComponent, reactive, watch } from 'vue'

// const Fade = MTransitions.Fade

type DatePickEventT = (ymd: DateInputT) => DateOutputT

export type DateModeT = 'Year' | 'Month' | 'Day'
interface MikuDateProps {
  modelValue: string
  // 时间选择类型
  mode: DateModeT
  // 外部抉择 -- 时间选择回调
  onDatePick: () => void
}

type DateCompoInstance<Z> = VNode<Z>

interface MikuDateState {
  // 时间选择器 -- 弹出层开关
  M5howDatePicker: boolean

  // 元组定义 ~~Ba!! ❀ 时间选择器 -- 预置内组件
  // miku_date_compos: [DateCompoInstance<DHType>, DateCompoInstance<DBType>, DateCompoInstance<DFType>];

  // 时间选择器 -- 当前操作类型:: 1._Year | 2._Month | 3._Day
  dateMode: DateModeT

  // 时间选择器 -- 实例组件 -> 记录当前时间
  currentDate: DateOutputT

  // 时间选择器 -- 当前 年 - 月 - 日 _ 日期记录
  now: DateBaseProps

  // 时间选择器 -- 内部时间数值 输入输出转换器
  // dateConvert: DatePickEventT;
}

type MIKU_DATE_COMPOS = [DateCompoInstance<DHType>, DateCompoInstance<DBType>, DateCompoInstance<DFType>]

// 基于 时间选择器 -- 头 | 身 | 尾 -- 3个子组件模板 -> prepare构造对应 - 3个子组件实例
const miku_date_CompoFactory: [DHType, DBType, DFType] = [DateHead, DateBody, DateFoot]
export default defineComponent({
  name: 'M9DatePicker',
  props: {
    modelValue: {
      type: String as PropType<MikuDateProps['modelValue']>
    },
    mode: {
      type: String as PropType<MikuDateProps['mode']>,
      default: 'Day'
    }
  },
  emits: ['datePick', 'update:modelValue'], // MikuDateProps['datePick']
  setup (props, ctx) {
    // * 每次调用--日期组件->必定最先执行的操作::获取当前_YY-MM-DD_时间
    function getYYMMDDFromNow (now: DateNow): DateBaseProps {
      const Y = now.year()
      const M = now.month() + 1
      const D = now.date()
      const _now01 = {
        MY: Y,
        MM: M,
        MD: D
      }

      return _now01
    }

    const now = dayjs()
    const Y_M_D = getYYMMDDFromNow(now)

    watch(() => props.modelValue, (nowDateString) => {
      const dayjsNow = dayjs(nowDateString)
      const nowArray = dayjsNow.format('YYYY-MM-DD').split('-')
      state.now = { MY: Number(nowArray[0]), MM: Number(nowArray[1]), MD: Number(nowArray[2]) }
      state.currentDate = dayjsNow
    })

    const state = reactive<MikuDateState>({
      M5howDatePicker: false,
      currentDate: now,
      now: Y_M_D,
      dateMode: props.mode
    })

    // 预处理--提前备好<==>[-实例化-]的各个小组件
    function prepareCompos (
      onUpdateDate: (updateNow: DateBaseProps) => void,
      mode: DateModeT,
      Y_M_D: DateBaseProps
    ): MIKU_DATE_COMPOS {

      const key = Object.values(Y_M_D).join('-')
      // key={key + '@H'}
      const head: DateCompoInstance<DHType> = <DateHead key={key + '@H'} { ...Y_M_D } onNotifyUpdate={onUpdateDate}></DateHead>
      // key={key + '@B'}
      const body: DateCompoInstance<DBType> = <DateBody key={key + '@B'} { ...Y_M_D } mode={mode} onNotifyUpdate={onUpdateDate}></DateBody>
      // key={key + '@F'}
      const foot: DateCompoInstance<DFType> = <DateFoot key={key + '@F'}></DateFoot>

      const miku_date_compos = [head, body, foot] as MIKU_DATE_COMPOS
      return miku_date_compos
    }

    function onSwitch5HowDatePicker (visable: boolean) {
      state.M5howDatePicker = visable
    }

    function dateConvert (DateInput: number) {
      const { currentDate, dateMode } = state
  
      let outputDate
  
      switch (dateMode) {
        case 'Year':
          const pickY = DateInput
          outputDate = currentDate.set('y', pickY)
          break
        case 'Month':
          const pickM = DateInput - 1
          outputDate = currentDate.set('M', pickM)
          break
        case 'Day':
          const pickD = DateInput
          outputDate = currentDate.set('D', pickD)
          break
        default:
          outputDate = currentDate
          break
      }
  
      return outputDate
    }

    function onUpdateDate (updateNow: DateBaseProps) {
      const joinNow = Object.values(updateNow).join('-')
      const _dayjs = dayjs(joinNow)
      state.now = updateNow
      state.currentDate = _dayjs
      ctx.emit('update:modelValue', joinNow)
    }

    return { state, onSwitch5HowDatePicker, onUpdateDate, prepareCompos }
  },
  render () {
    const {
      prepareCompos,
      onUpdateDate,
      onSwitch5HowDatePicker,
      state: { currentDate, M5howDatePicker, dateMode, now }
    } = this
    const compos = prepareCompos(onUpdateDate, dateMode, now)
    const MInputAdvanced = {
      modelValue: currentDate.format('YYYY-MM-DD'),
      // onBlur: () => { switch5HowDatePicker(false) },
      onFocus: () => { onSwitch5HowDatePicker(true) }
    }

    const ReferInputEntryJSX = <Input customIcon="date" {...MInputAdvanced} />

    return (
      <Popover
        showPop={M5howDatePicker}
        position='down'
      >
        {
          {
            default: () => ReferInputEntryJSX,
            content: () => <div className={MikuDatePreCls}>{compos.map((compo) => compo)}</div>
          }
        }
      </Popover>
    )
  }
})