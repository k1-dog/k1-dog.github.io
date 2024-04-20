import { InteractionT, AnimationOptionsT } from './m9.d'
import { _noop, H_M9UUID, H_isFunction } from './helper.core'
import { _DeviceRatioBuilding, H_ImageDataRGBa } from './helper.canvas'

const _M9UUID = H_M9UUID()

// - M9 Charts 各图表类型集合
type M9TypesT = 'Bar' | 'Pie' | 'Radar'

/**
* @type { AnimationCtor } 动画处理器
* 记录 M9-Charts 画布中, 核心图形的对应动画渲染器
*/

class M9Animation {

  // 策略对象 - 各类型图 动画处理上下文
  static Animators: Record<'Bar', Record<'click', AnimationOptionsT>> = {
    'Bar': {
      'click': {
        startState: ($Interaction) => {
          // hsl(color, 0.9) 颜色处理函数 - 减亮
          const darkenImageData = H_ImageDataRGBa($Interaction.imageData, 10, '-')
          
          return {
            state: $Interaction.core - 10,
            imageData: darkenImageData
          }
        },
        endState: ($Interaction) => {
          // hsl(color, 1.1) 颜色处理函数 - 增亮
          const lightenImageData = H_ImageDataRGBa($Interaction.imageData, 20, '+')

          return {
            state: $Interaction.core + 10,
            imageData: lightenImageData
          }
        },
        beforeAnimating: (CurrentState, $Interaction, $M9Chart) => {
          const { w, h, t, l } = $Interaction
          $M9Chart.ctx.clearRect(l, t, w, h)
        },
        ctxCurrentState: (CurrentState, $Interaction, $M9Chart) => {
          const { imageData } = CurrentState
          const { width: imgDW, height: imgDH } = imageData
          const { w, h, l, t } = $Interaction
          $M9Chart.ctx.putImageData(imageData, imgDW, imgDH)
        },
        afterAnimating: _noop,
        isStopFn: (CurrentState, TargetState) => {
          return CurrentState.state >= TargetState.state
        },
        calcNextState: (CurrentState) => {
          const { state, imageData } = CurrentState
          const nextState = state * 1.02 //
          const nextImageData = H_ImageDataRGBa(imageData, 0.02, '+')
          return {
            state: nextState,
            imageData: nextImageData
          }
        }
      }, // 鼠标点击式 ~ 动效::0.5s内 高亮柱形图颜色 (先暗后亮)
      // 鼠标悬浮式 ~ 动效::1.0s内 弹跳+缩放柱形图
      // 数值更新式 ~ 动效::0.5s内 平滑重绘柱形图
      // 柱形拖动式 ~ 动效::??
    }
  }

  _AID: string
  _M9Chart?: any
  _interaction?: InteractionT

  constructor ($Interaction: InteractionT, $M9Chart) {
    this._AID = _M9UUID('A')
    this._interaction = $Interaction
    this._M9Chart = $M9Chart
  }

  /**
  * 启动动画
  * @param { * M9图表类型 * } M9CType
  */
  _ready_ (M9CType: M9TypesT = 'Bar') {
    const { startState, endState, ctxCurrentState, isStopFn, calcNextState } = M9Animation.Animators[M9CType]['click']
    this._run_({ startState, endState, ctxCurrentState, isStopFn, calcNextState }, null)
  }

  // 执行动画
  _run_ ($AnimationOptions, $RAF_T: number | null = null) {
    const { startState, endState, ctxWithCurrentState, isStop, calcNextState, beforeAnimating, M9WhisperComeTrue, done } = $AnimationOptions
    const interaction = this._interaction
    const __currentState = H_isFunction(startState) ? startState(interaction) : startState
    const __targetState = H_isFunction(endState) ? endState(interaction) : endState
    if (!isStop(__currentState, __targetState)) {
      const _AnimationCoreArgs =
        [
          __currentState,
          interaction,
          this._M9Chart
        ]
      beforeAnimating && beforeAnimating(..._AnimationCoreArgs)
      ctxWithCurrentState(..._AnimationCoreArgs)

      let RAF_T : number | null = window.requestAnimationFrame(() => {
        const nextState = calcNextState(__targetState, ..._AnimationCoreArgs)
        const _nextAnimationOption = { ...$AnimationOptions, startState: nextState }
        this._run_(_nextAnimationOption, RAF_T)
        RAF_T = null
      })
    } else {
      $RAF_T = null
      M9WhisperComeTrue && M9WhisperComeTrue(__targetState)
      // 过渡动画结束后, 执行一个结束周期 - 因为可能会有些特殊操作, 需要在动画结束后实现一下
      done && done(this._M9Chart, interaction)
    }
  }

  /**
  * 停止动画
  * 
  */
  _stop_ () {
    1
  }

  // 通知 - M9 Element 图形元素重渲染
  _notifyM9ElDraw_ () {
    this._M9Chart.__draw__(this._interaction)
  }
  // 更新 - Interaction·位置探测器 对应位置信息
  _updateA_I ($newInteraction: InteractionT) {
    this._interaction = $newInteraction
  }
}

export default M9Animation