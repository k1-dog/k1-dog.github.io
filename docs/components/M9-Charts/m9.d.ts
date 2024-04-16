import { M9PathT } from './m9.element0'

import type M9Chart from './m9._1_'
import type M9TooltipT from './m9.tooltip'
import type M9Animation from './m9.animator'
import type M9Interactor from './m9.interactor'

export interface Point {
  x: number;
  y: number;
}

/**
 * @type 后续补充注释 ~ 没注释挺难理解 [像是定义一个图形 上下左右四边 到坐标轴的垂直距离]
 */
export type TRBL = {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * @type 后续补充注释 ~ 没注释挺难理解 [像是 定义了矩形 四个角落 到坐标轴边缘, emm好像不是 再理解理解]
 */
export type TRBLCorners = {
  topLeft: number;
  topRight: number;
  bottomLeft: number;
  bottomRight: number;
};

type InteractionT = M9PathT
  & { 'imageData': ImageData }
  & { 'IID': string }
  & { 'MAX': any; 'MIN': any } // ? 所有图形范围内 - 最大值 & 最小值


// - 动效状态类型
type AnimationStateT = { state: any; imageData: ImageData }
// - 动效配置信息类型
type AnimationOptionsT = {
  // - 开始状态
  startState: ($Interaction: InteractionT) =>  AnimationStateT
  // - 终止状态
  endState: ($Interaction: InteractionT) =>  AnimationStateT
  // - 画笔处理之前
  beforeAnimating?: (CurrentState: AnimationStateT, $Interaction: InteractionT, $M9Chart: any) => void
  // - 画笔处理当前状态
  ctxCurrentState: (CurrentState: AnimationStateT, $Interaction: InteractionT, $M9Chart: any) => void
  // - 画笔处理之后
  afterAnimating?: (CurrentState: AnimationStateT, $Interaction: InteractionT, $M9Chart: any) => void
  // - 计算下一个状态
  calcNextState: (CurrentState: AnimationStateT, TargetState: AnimationStateT, $M9Chart: any) => AnimationStateT
  // - 判断是否达到终止态
  isStopFn: (CurrentState: AnimationStateT, TargetState: AnimationStateT) =>  boolean
}

export type M9DatasetT = Array<
  { value: any; label: string; }
>

/**
 * @M9Say 美九图表构造器
 */
export { M9Chart, M9Animation, M9Interactor, M9TooltipT, M9PathT, InteractionT, AnimationOptionsT }