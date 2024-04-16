import classNames from 'classnames'
import dayjs from 'dayjs'
import { M9Col, M9Row } from '../Grid/Grid'
import { DateModeT } from './DatePicker'
import { DateBaseProps, DateInputT, DateOutputT, DateMatrixT, MikuDatePreCls } from './index'
import { PropType, defineComponent, nextTick, reactive } from 'vue'

interface MikuDateBodyProps extends DateBaseProps {
  mode: DateModeT

  notifyUpdate: (updateDate: DateBaseProps) => void
}

interface MikuDateBodyState {
  selectDate: DateOutputT
}

type dayCellUnit = {
  v: DateInputT
  k: DateOutputT
  disabled: boolean
}

type AdvicedDateRowT = Array<dayCellUnit>
type PuredDateRowT = Array<number>
// 月数据矩阵 -- 4 x 3
type MonthDataArray = DateMatrixT<DateMatrixT<dayCellUnit, 4>, 3>
// 日数据矩阵 -- 7 x 6
type DayDataArray = DateMatrixT<DateMatrixT<dayCellUnit, 7>, 6>

// 根据日期类型 -- 动态推断 日期数字矩阵类型
type datePanelT<Z> = Z extends 'Month' ? MonthDataArray : DayDataArray

// 纯日期类型<number> 转.=>.换 复杂日期类型<dayCellUnit>
// 传入的纯日期数组长度不确定, 意图用泛型 <L> 动态传递 -> 推断数组长度.
function _U$SetKVOfDayUnit(daysOrMonth: PuredDateRowT, now: DateBaseProps, _last_cur_next_: number = 0): AdvicedDateRowT {
  const { MY, MM } = now // # 基于 哪年哪月 - 生成该年月内的日期天数
  return daysOrMonth.map((pureDay) => ({
    k: dayjs(`${MY}-${MM + _last_cur_next_}-${pureDay}`),
    v: pureDay,
    disabled: _last_cur_next_ !== 0 // ! 该标志0代表当月, 非0时 控制非当月日期禁止选择
  }))
}

enum MONTH {
  scale = 4
}

type PureMonthsT = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

function genPureMonths(): PureMonthsT {
  console.log(arguments)
  const _pureMonths = new Array(12).fill(0).map((_, _g) => _g + 1) as PureMonthsT
  return _pureMonths
}
/**
 * @description 生成 - 月类面板 - 日期数据
 * @function _$MonthData
 * @param { DateBaseProps } $now
 * @returns { datePanelT<'Month'> } @param months
 */
function _$MonthData($now: DateBaseProps): datePanelT<'Month'> {
  // const { MY, MM } = $now
  const PureMonths: PureMonthsT = genPureMonths()
  const _panelMonths = _U$SetKVOfDayUnit(PureMonths, $now)

  var _posAt: pointer = 0

  function eat(n: number = MONTH.scale): void {
    _posAt += n
    return
  }

  eat(0)
  const _month$01 = _panelMonths.slice(_posAt, _posAt + MONTH.scale)
  eat(MONTH.scale)
  const _month$02 = _panelMonths.slice(_posAt, _posAt + MONTH.scale)
  eat(MONTH.scale)
  const _month$03 = _panelMonths.slice(_posAt, _posAt + MONTH.scale)

  const datePanelOfMonths = [_month$01, _month$02, _month$03] as datePanelT<'Month'>

  return datePanelOfMonths
}

type pointer = number
enum WEEK {
  scale = 7
}

function _U$RangeDayOfDiffMonth($now: DateBaseProps): {
  daysInPrevMonth: DateInputT[]
  daysInCurMonth: DateInputT[]
  daysInNextMonth: DateInputT[]
} {
  const { MY, MM, MD } = $now

  // 获取当前 月份第一天 是星期几 ?
  const _1stDayIn1stWeek = dayjs()
    .set('y', MY)
    .set('M', MM - 1)
    .set('D', 1)
    .day()
  // 获取上个 月份 共有几天 ?
  const _daysInPrevMonth = dayjs(`${MY}-${MM}`).subtract(1, 'M').daysInMonth()
  // 当前月份 第一周数据 需要选取 上一月份数据 -- 填充
  const lastMonthDayPointer = _1stDayIn1stWeek % (WEEK.scale + 1)
  // a). __生成 上个月的 填充数据
  const daysInPrevMonth = ((_start, _Len) => {
    let _arr: Array<number> = []
    _start = _start - _Len + 1
    while (_Len--) {
      _arr.push(_start)
      _start += 1
    }
    return _arr
  })(_daysInPrevMonth, lastMonthDayPointer)

  // 获取当前 月份 共有几天 ?
  const _daysInCurMonth = dayjs(`${MY}-${MM}`).daysInMonth()
  // b). __生成 当月的 填充数据
  const daysInCurMonth = new Array(_daysInCurMonth).fill(0).map((_, _i) => _i + 1)
  const totalPanelLength = WEEK.scale * 6
  // 获取 下个月份的 填充数据长度
  const _daysInNextMonth = totalPanelLength - lastMonthDayPointer - _daysInCurMonth
  // c). __生成 下月的 填充数据
  const daysInNextMonth = new Array(_daysInNextMonth).fill(0).map((_, _j) => _j + 1)
  // d). __组合拼装 上月-当月-下月 填充数组
  const _$concatDaysInMonth = {
    daysInPrevMonth,
    daysInCurMonth,
    daysInNextMonth
  }

  return _$concatDaysInMonth
}

/**
 * @description 生成 - 日类面板 - 日期数据
 * @function _$DayData
 * @param { DateBaseProps } $now
 * @returns { datePanelT<'Day'> } @param days
 */
function _$DayData($now: DateBaseProps): datePanelT<'Day'> {
  const { daysInPrevMonth, daysInCurMonth, daysInNextMonth } = _U$RangeDayOfDiffMonth($now)

  const _daysInPrevMonth = _U$SetKVOfDayUnit(daysInPrevMonth, $now, -1)
  const _daysInCurMonth = _U$SetKVOfDayUnit(daysInCurMonth, $now, 0)
  const _daysInNextMonth = _U$SetKVOfDayUnit(daysInNextMonth, $now, 1)

  var _posAt: pointer = 0

  function eat(n: number = WEEK.scale): void {
    _posAt += n
    return
  }

  const prevDaysLen = _daysInPrevMonth.length
  const currentDaysLen = _daysInCurMonth.length
  // const nextDaysLen = _daysInNextMonth.length

  const _1_2_ = WEEK.scale * 1 - prevDaysLen // 上个月 ~ 当前月 临界指针位置
  const _2_3_ =
    prevDaysLen + currentDaysLen <= WEEK.scale * 5 ? currentDaysLen : _daysInCurMonth[WEEK.scale * 5 - prevDaysLen - 1].v // 当前月 ~ 下个月 临界指针位置

  eat(0)
  const _week$01 = [..._daysInPrevMonth, ..._daysInCurMonth.slice(_posAt, _1_2_)]
  eat(_1_2_)
  const _week$02 = _daysInCurMonth.slice(_posAt, _posAt + WEEK.scale)
  eat(WEEK.scale)
  const _week$03 = _daysInCurMonth.slice(_posAt, _posAt + WEEK.scale)
  eat(WEEK.scale)
  const _week$04 = _daysInCurMonth.slice(_posAt, _posAt + WEEK.scale)
  eat(WEEK.scale)
  
  console.log(_posAt, _daysInNextMonth)

  const _week$05 =
    _posAt + WEEK.scale <= currentDaysLen
      ? _daysInCurMonth.slice(_posAt, _posAt + WEEK.scale)
      : [..._daysInCurMonth.slice(_posAt), ..._daysInNextMonth.slice(0, _posAt + WEEK.scale - _2_3_)]
  eat(WEEK.scale)
  const _week$06 =
    _posAt >= currentDaysLen
      ? _daysInNextMonth.slice(_posAt - _2_3_)
      : [..._daysInCurMonth.slice(_2_3_), ..._daysInNextMonth]

  const datePanelOfDays = [_week$01, _week$02, _week$03, _week$04, _week$05, _week$06] as datePanelT<'Day'>

  return datePanelOfDays
}

type I<Z> = Z extends datePanelT<infer U> ? U : I<Z>

function isMonthD(D1: DateModeT): D1 is 'Month' {
  return D1 === 'Month'
}

function isDayD(D2: DateModeT): D2 is 'Day' {
  return D2 === 'Day'
}

function isYearD(D3: DateModeT): D3 is 'Year' {
  return D3 === 'Year'
}

/**
 * @see ~!important::生成日期组件_主体区域_数据源
 * @returns { datePanelT<Z> } @description 返回--二维日期矩阵
 */
function genDateBody<Z extends DateModeT>(mode: Z, now: DateBaseProps): datePanelT<Z> {
  var bodyData: datePanelT<Z> | undefined

  if (isMonthD(mode)) {
    bodyData = _$MonthData(now) as datePanelT<Z>
  }
  if (isDayD(mode)) {
    bodyData = _$DayData(now) as datePanelT<Z>
  }
  if (isYearD(mode)) {
  }
  return bodyData as datePanelT<Z>
}

enum EMOJI {
  left = '🐇',
  right = '🦄',
  MonHead1 = '❄️',
  MonHead2 = '🥮',
  MonHead3 = '🏮',
  MonHead4 = '🧨'
}
type MonthPanelHead = [EMOJI.MonHead1, EMOJI.MonHead2, EMOJI.MonHead3, EMOJI.MonHead4]
type DayPanelHead = ['凌寒⑦', '折纸①', '阿姨②', '狂三③', '小四④', '琴里⑤', '六儿⑥']
type dateHeadT<H extends DateModeT> = H extends 'Month' ? MonthPanelHead : DayPanelHead

function _$MonthHead(): MonthPanelHead {
  return [EMOJI.MonHead1, EMOJI.MonHead2, EMOJI.MonHead3, EMOJI.MonHead4]
}
function _$DayHead(): DayPanelHead {
  return ['凌寒⑦', '折纸①', '阿姨②', '狂三③', '小四④', '琴里⑤', '六儿⑥']
}
/**
 * @see ~!important::生成日期组件_头部区域
 * @returns { datePanelT<Z> } @description 返回--一维维日期头部
 */
function genDateHead<H extends DateModeT>(mode: H): dateHeadT<H> {
  var bodyData: dateHeadT<H> | undefined

  if (isMonthD(mode)) {
    bodyData = _$MonthHead() as dateHeadT<H>
  }
  if (isDayD(mode)) {
    bodyData = _$DayHead() as dateHeadT<H>
  }
  if (isYearD(mode)) {
  }
  return bodyData as dateHeadT<H>
}

const _DayJSX = (props: {
  head: DayPanelHead
  body: DayDataArray
  selectDate: MikuDateBodyState['selectDate']
  onSelect: (date: MikuDateBodyState['selectDate']) => void
}) => {
  const { head, body, selectDate, onSelect } = props
  const HLen = head.length

  const ActivingUnit = (theUnitDate: DateOutputT) => theUnitDate.format('YYYY-MM-DD') === selectDate.format('YYYY-MM-DD')
  const body_head_preCls = classNames(`${MikuDatePreCls}-body__date-col`, `${MikuDatePreCls}-body__date-head`)
  return (
    <div className={`${MikuDatePreCls}-body`}>
      <div className={`${MikuDatePreCls}-body__date-row`}>
        {
          head.map((_h, _p) => <div className={body_head_preCls} key={_p}>{_h}</div>)
        }
      </div>
      {
        body.map((_dateRow, _m) => (
          <div key={_m} className={`${MikuDatePreCls}-body__date-row`}>
            {
              _dateRow.map((_dateCol, _q) => (
                <div
                  key={_q}
                  className={classNames(`${MikuDatePreCls}-body__date-col`, {
                    selected: ActivingUnit(_dateCol.k),
                    disabled: _dateCol.disabled
                  })}
                  onClick={(e) => { onSelect(_dateCol.k) }}>
                  {_dateCol.v}
                </div>
              ))
            }
          </div>
        ))
      }
    </div>
  )
}

const _MonthJSX = (props: {
  head: MonthPanelHead
  body: MonthDataArray
  selectDate: MikuDateBodyState['selectDate']
  onSelect: (date: MikuDateBodyState['selectDate']) => void
}) => {
  const { head, body, onSelect } = props
  const HLen = head.length
  return (
    <div className={`${MikuDatePreCls}-body`}>
      <M9Row MGGutter={10}>
        {
          head.map((_h) => <M9Col span={24 / HLen} key={_h}>{_h}</M9Col>)
        }
      </M9Row>
      <M9Row MGGutter={5}>
        {
          body.map((_dateRow) => (
            <M9Row MGGutter={[10, 10]}>
              {
                _dateRow.map((_dateCol) => (
                  <M9Col span={Math.floor(24 / MONTH.scale)}>
                    <span className={`${MikuDatePreCls}-body`} onClick={() => { onSelect(_dateCol.k) }}>
                      {_dateCol.v}
                    </span>
                  </M9Col>
                ))
              }
            </M9Row>
          ))
        }
      </M9Row>
    </div>
  )
}

export type _DateBodyType = any

export default defineComponent({
  name: 'M9DateBody',
  props: {
    MY: {
      type: Object as PropType<MikuDateBodyProps['MY']>
    },
    MM: {
      type: Object as PropType<MikuDateBodyProps['MM']>
    },
    MD: {
      type: Object as PropType<MikuDateBodyProps['MD']>
    },
    mode: {
      type: String as PropType<MikuDateBodyProps['mode']>,
      default: 'Day'
    }
  },
  emits: ['notifyUpdate'],
  setup (props, ctx) {
    const { MY, MM, MD } = props
    const state = reactive({ selectDate: dayjs(`${MY}-${MM}-${MD}`) })

    const getPanelData = genDateBody

    const getPanelHead = genDateHead

    function onSelectDate(date: MikuDateBodyState['selectDate']) {
      state.selectDate = date
      nextTick(() => {
        const { mode, MY, MM, MD } = props
        const { selectDate } = state
        const now = mode === 'Day' ? { MY: selectDate.year(), MM: selectDate.month() + 1, MD: selectDate.date() } : { MY: selectDate.year(), MM: selectDate.month() + 1, MD }
        ctx.emit('notifyUpdate', now)
      })
    }

    return { state, getPanelHead, getPanelData, onSelectDate }
  },
  render () {
    const {
      getPanelHead,
      getPanelData,
      onSelectDate,
      state: { selectDate },
      $props: { mode, MY, MM, MD }
    } = this
    const now = { MY, MM, MD } as any
    if (isMonthD(mode)) {
      const _R$Data = getPanelData<'Month'>(mode, now)
      const _R$Head = getPanelHead<'Month'>(mode)
      const compo = { head: _R$Head, body: _R$Data, selectDate, onSelect: onSelectDate }
      return _MonthJSX(compo)
    } else if (isDayD(mode)) {
      const _R$Data = getPanelData<'Day'>(mode, now)
      const _R$Head = getPanelHead<'Day'>(mode)
      const compo = { head: _R$Head, body: _R$Data, selectDate, onSelect: onSelectDate }
      return _DayJSX(compo)
    } else { return null }
  }
})