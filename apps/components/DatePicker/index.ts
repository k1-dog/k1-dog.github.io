// (-*^*-) 小美九 |> -<时间>-选择器 图稿

import { Dayjs } from 'dayjs'
import DatePicker from './DatePicker'

// (----------------------🐹🐹🐹-----------------------)  => 日期头部 SFC
// |      < ❀❀   ___  2022年 06月 28日  ___   ❀❀ >     |
// |-----------------------------------------------------|
// | 🐇 折纸① 阿姨② 狂三③ 小四④ 琴里⑤ 六儿⑥ 凌寒⑦ 🦄 | => 日期主体
// |      27    28     1     2      3      4     5       |           |
// |       6     7     8     9     10     11    12       |           |--> a).周期头_<一周七天的头部>_ 组件
// |      13    14    15    16     17     18    19       |           |--> b).生成 5 x 7 的二维 号数矩阵 组件
// |      20    21    22    23     24     25    26       |
// |      27    28    29    30     31      1     2       |
// |       3     4     5     6      7      8     9       |
// |___🐱___________________🐈____________________🐕___| => 日期尾部 _<颜文字组成>_ 组件

// (-*^*-) 小美九 |> -<时刻>-选择器 图稿

//     (^~^)🐅
//   ~$       o9
//  %^         yl
// @!    0 -->  $r
//  $%    \    n0_
//   ^*    \  mh9
//    🦝(+)_=

export const MikuDatePreCls = 'miku-date'
export type DateNow = Dayjs
export type DateOutputT = Dayjs /** @see DateConstructor */
export type DateInputT = number

/** @see 递归生成__日期数据矩阵&&~TS递归定义固定长度数组类型 */
export type DateMatrixT <
  U,
  N extends number,
  R extends Array<U> = []
> = R['length'] extends N ? R : DateMatrixT<U, N, [U, ...R]>

// var _Uint8Array$7_6: DateMatrixT<
//   DateMatrixT<Uint8Array, 7>, 6
// > = [[
//   ...((_Len) => {
//     let arr: DateMatrixT<Uint8Array, 7> | any[] = []
//     for (let _i = 0; _i < _Len; _i++)
//     { arr.push(new Uint8Array(_i)) }
//     return arr as DateMatrixT<Uint8Array, 7>
//   })(7)
// ]]

export interface DateBaseProps {
  // 由 -- 最外层 MikuDate 容器 ~ 传入 - 年
  MY: DateInputT

  // 传入 - 月
  MM: DateInputT

  // 传入 - 日
  MD: DateInputT
}

const MikuDatePicker = DatePicker
// MikuDatePicker.TimePicker = TimePicker

export default MikuDatePicker
