
import { _noop, H_StrongMethodsInThisClass } from './helper.core'
import { _limit } from './helper.math'
import { M9PathT } from './m9.element0'
import { _defaultGap } from './helper.options'
import { M9Interactor as InteractorClassT, M9Chart as M9T } from './m9'
import { _DeviceRatioBuilding, U$Push_Pop_Ctx2D, RetinaBuildingForOurEyes } from './helper.canvas'
import M9Element from './m9.element0'

  class Bar extends M9Element { // extends M9Element
    
    M9: M9T
    xPoints: Array<number>
    yPoints: Array<number>

    constructor ($BarConfig) {
      const { width: w, height: h } = $BarConfig
      super({ w,h })
      
      this.initConfig($BarConfig)

      this.initBind()
      // this.__Bar__()
    }

    initConfig ($BarConfig) {
      const { xScales, yScales, M9 } = $BarConfig
      // M9 - 绘制前, 先建立起最准确的视觉坐标系统
      const { xAxisPoints, yAxisPoints, defaultGapX, defaultGapY } = RetinaBuildingForOurEyes(
        M9, xScales, yScales
      )
      
      this.M9 = M9
      _defaultGap.x = defaultGapX
      _defaultGap.y = defaultGapY
      this.xPoints = xAxisPoints
      this.yPoints = yAxisPoints
    }

    initBind () {
      H_StrongMethodsInThisClass(this, ['X_Y', 'X_Y_Lines'])
    }

    // 美九Charts - 柱状图 <Bar> 绘制器
    __Bar__(Interactor: InteractorClassT) {
      if (!Interactor._M9Chart) return
      const { X_Y, X_Y_Lines, M9 } = this
      U$Push_Pop_Ctx2D(Interactor._M9Chart.ctx, X_Y)
      U$Push_Pop_Ctx2D(Interactor._M9Chart.ctx, X_Y_Lines)
      // _initSkeleton_(Interactor)
      
      const { axisY: { start: Y0, end: Y1 } } = this.U$CalcXYAxes()
      Interactor._interactions.forEach((__interaction) => {
        const _startState = {
          ws: 0, // ? width - start
          hs: 0, // ? height - start
          alphaS: 0.1
        }
        const _endState = ($interaction) => {
          return {
            we: $interaction.w, // ? width - end
            he: $interaction.h,
            alphaE: 1.0
          }
        }
        const _beforeAnimating = ($lastState, $interaction, $M9Chart) => {
          const { ws: lastW, hs: lastH } = $lastState
          const { w: W, h: H, l: L, t } = $interaction
          const _Last_X_ = L + Math.floor((W - lastW) / 2)
          const _Last_Y_ = Y1 - lastH
          $M9Chart.ctx.clearRect(_Last_X_, _Last_Y_, lastW, lastH) // ! 每次清空 上一过渡状态 遗留的图形范围内容
        }
        const _ctxWithCurrentState = ($CurrentState, $interaction, $M9Chart) => {
          const { ws, hs, alphaS } = $CurrentState
          const { w: W, h: H, l: L, t } = $interaction
          const _x_now_ = L + Math.floor((W - ws) / 2)
          const _y_now_ = Y1 - hs
          const _BarPath = { w: ws, h: hs, l: _x_now_, t: _y_now_ }
          U$Push_Pop_Ctx2D($M9Chart.ctx, ($ctx, $BarPath) => { ($ctx.globalAlpha = alphaS, this.draw($ctx, $BarPath)) }, _BarPath)
        }
        const _isStop = ($CurrentState, $TargetState) => {
          const { ws, hs, alphaS }  = $CurrentState
          const { we, he, alphaE } = $TargetState
          const isStop = ws >= we && hs >= he && alphaS >= alphaE
          return isStop
        }
        const _calcNextState = ($TargetState, $CurrentState, $Interaction, $M9Chart) => {
          const { ws: ws0, hs: hs0, alphaS } = $CurrentState
          const { we: we1, he: he1, alphaE } =  $TargetState
          const nextWs0 = ws0 + 1.0
          const nextHe0 = hs0 + _defaultGap.y / 10
          const nextAlpha = alphaS + 0.01
          const _nextState = {
            ws: nextWs0 < we1 ? nextWs0 : we1,
            hs: nextHe0 < he1 ? nextHe0 : he1,
            alphaS: nextAlpha < alphaE ? nextAlpha : alphaE
          }
          return _nextState
        }
        Interactor._StartAnimation_(__interaction, ({ startState: _startState, endState: _endState, beforeAnimating: _beforeAnimating, ctxWithCurrentState: _ctxWithCurrentState, isStop: _isStop, calcNextState: _calcNextState }) as any)
      })
    }
    
    U$CalcXYAxes () {
      const { xPoints: $XPoints, yPoints: $YPoints } = this
      const { x: _gapX, y: _gapY } = _defaultGap
      const _xStart = 0 // $XPoints[0] - $XPoints[0] % _gapX
      const _xLen = $XPoints.length
      const _xEnd = $XPoints[_xLen - 1] + ($XPoints[_xLen - 1] % _gapX === 0 ? 0 : _gapX - $XPoints[_xLen - 1] % _gapX)
      const axisX = {
          start: _xStart,
          end: _xEnd,
          len: _xLen
      }
  
      const _yStart = 0 // $YPoints[0] - $YPoints[0] % _gapY
      const _yLen = $YPoints.length
      const _yEnd = $YPoints[_yLen - 1] + ($YPoints[_yLen - 1] % _gapY === 0 ? 0 : _gapY - $YPoints[_yLen - 1] % _gapY)
      const axisY = {
          start: _yStart,
          end: _yEnd,
          len: _yLen
      }
  
      return { axisX, axisY }
    }

    // ! 绘制横纵坐标轴
    X_Y ($ctx) {
      // ----
      const { axisX, axisY } = this.U$CalcXYAxes()

      $ctx.strokeStyle = '#ccccce'
      $ctx.lineWidth = 2

      $ctx.beginPath()
      
      // 开始-X
      // 画-x-轴
      $ctx.moveTo(0, axisY.end)
      $ctx.lineTo(axisX.end, axisY.end)
      // 结束-X

      // 开始-Y
      // 画-y-轴
      $ctx.moveTo(0, 0)
      $ctx.lineTo(0, axisY.end)
      // 结束-Y

      $ctx.stroke()
    }

    X_Y_Lines ($ctx) {
      const labels = ['鸢一折纸', '本条二亚', '时崎狂三', '五河琴里', '诱宵美九']
      // 文字标签 - 坐标轴距离
      const labelGap = 15
      // 横纵轴线 - 末端尾部长度
      const tailLen = 5
  
      $ctx.font = '12px _'
      $ctx.fillStyle = '#ffffff'
      $ctx.strokeStyle = '#e3e3e5'
  
      $ctx.beginPath()
      // ----
      const { axisX, axisY } = this.U$CalcXYAxes()
  
      const { x: _gapX, y: _gapY } = _defaultGap
  
      for (let y = axisY.start; y <= axisY.end; y += _gapY) {
          $ctx.moveTo(0 - tailLen, y)
          $ctx.lineTo(axisX.end, y)
          const labelY = y
          // 计算文字标签 - 自身宽度
          const labelOffsetWidth = $ctx.measureText(labelY).width
          $ctx.fillText(labelY, 0 - labelOffsetWidth - tailLen - 5, axisY.end - axisY.start - y + 5 )
      }
      for (let x = axisX.start; x <= axisX.end; x += _gapX) {
          $ctx.moveTo(x, 0)
          $ctx.lineTo(x, axisY.end + tailLen)
          // 填充坐标点刻度上 - 文字标签
          const labelIdx = x / _gapX
          if (x === axisX.end) break
          const labelX = labels[labelIdx]
          // 计算文字标签 - 自身宽度
          const labelOffsetWidth = (_gapX - $ctx.measureText(labelX).width) / 2
          $ctx.fillText(labelX, x + labelOffsetWidth, axisY.end - axisY.start + labelGap)
      }
      
      $ctx.stroke()
    }

    /**
     * @description 描制核心图形 path 路径
     * @param $ctx
     */
    buildingPaths (_M9CALL_ = _noop) {
      const { x: _gapX } = _defaultGap
      const { M9, yPoints } = this
      const barWidth = _gapX * 0.75
      let $$x = _gapX * 0.25 / 2
      
      const { axisY: { end: $end, start: $start } } = this.U$CalcXYAxes()

      const $$Y = $end - $start
      const _M9BarPaths = yPoints.map(($$y, _index) => {
        const _M9BarPath = {
          w: barWidth,
          h:  $$y,
          t: $$Y - $$y, // 上
          b: 0, // 下
          l: $$x, // 左
          r: M9.canvas.width - ($$x + barWidth), // 右
          n: _index, // 图形形状 Path 索引
          core: $$y, // 图形核心参数 - 用户传递的那个最关键状态值
        }
        $$x += _gapX
        return _M9BarPath
      })

      return _M9BarPaths
    }

    draw ($ctx, $path: M9PathT) {
      const { w, h, l, t } = $path
      
      $ctx.beginPath()

      $ctx.rect(l, t, w, h)

      $ctx.fillStyle = '#fdcea095'
      $ctx.fill()

      $ctx.lineWidth = 2
      $ctx.strokeStyle = '#fdbc7d'
      $ctx.stroke()
    }
  }

// 绘制柱状初始 - 起步渲染一个骨架屏 - 做到丝滑动画
function _initSkeleton_($interactor: InteractorClassT) {}

export default Bar