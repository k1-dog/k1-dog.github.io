
import M9Element, { M9PathT } from './m9.element0'
import { H_ClearArcArea, U$Push_Pop_Ctx2D } from './helper.canvas'
import { H_StrongMethodsInThisClass, H_M9Whisper } from './helper.core'
import { M9Chart as M9T, M9Interactor as InteractorClassT, M9DatasetT } from './m9'
import { PI, _2PI, _2_3PI, HALF_PI, _360, H_pow, H_floor, H_ceil, H_sqrt, H_abs, H_sin } from './helper.math'
import { isM9Number } from '../utils/helper'


type PointAtCenterT = { x0: number; y0: number }

class Pie extends M9Element {
  dataset: M9DatasetT
  M9: M9T
  _pointAtCenter: PointAtCenterT = { x0: 0, y0: 0 } // 圆心位置
  _angle1 = 0 // 饼图 - 起始角度
  _angle2 = 0 // 饼图 - 终止角度
  _radius = 0 // 饼图 - 半径

  static precision = H_pow(10, 7) // ? 圆周中的精度设置 - 确定好圆周精度, 否则会有 360度 圆周画不满的情况
  static pieColors = ['#fddc90', '#fddee6', '#36365d', '#374bb0', '#602aad', '#4c8ebb', '#acedf6']

  // * 角度转换弧度
  static U$ConvertAngleToRadian ($Angle: number) {
    const _precision = Pie.precision
    const _radian = H_ceil(PI * $Angle / 180 * _precision) / _precision // ? 画布中的旋转角度 - 以弧度为单位计算:: 弧度 = 角度 * Math.PI / 180
    return  _radian
  }

  constructor ($PieConfig) {
    super({ w: $PieConfig.width, h: $PieConfig.height })

    this.initConfig($PieConfig)

    this.initEyesSeeingPie()

    this.initBind()
  }

  initEyesSeeingPie () {
    const { _pointAtCenter: { x0: xOffset, y0: yOffset }, M9 } = this
    // M9.ctx.scale(1.25, 1.25)
  }

  initConfig (pieConfig) {
    const { M9, width: canvasW, height: canvasH, dataset } = pieConfig

    this.M9 = M9
    this.dataset = dataset

    this._pointAtCenter = {
      x0: H_floor(canvasW / 2),
      y0: H_floor(canvasH / 2)
    }
    this._radius = H_floor(canvasW / 3)
  }

  initBind () {
    H_StrongMethodsInThisClass(this, ['draw', 'drawLineTip'])
  }

  // 美九Charts - 饼状图 <Pie> 绘制器
  __Pie__(Interactor: InteractorClassT) {
    let Magnification = 5 // * 定义动画变换倍率
    const M9Whisper = new H_M9Whisper({ angle: 0, rotationAngle: 0 })
    Interactor._interactions.forEach((__interaction, index) => {
      M9Whisper.$whisper(($lastEndState, $ct) => {
        const _startState = { angle: 0, rotationAngle: __interaction.rotationAngle } // { ...$lastEndState }
        const _endState = ($interaction) => {
          return { angle: $interaction.angle2, rotationAngle: $interaction.rotationAngle }
        }
        const _beforeAnimating = ($lastState, $interaction, $M9Chart) => {
          // $M9Chart.canvas.width = $M9Chart.width
          // $M9Chart.canvas.height = $M9Chart.height
          // $M9Chart.ctx.clearRect(-$M9Chart.canvas.width, -$M9Chart.canvas.height, $M9Chart.canvas.width*2, $M9Chart.canvas.height*2);
        }
        const _ctxWithCurrentState = ($CurrentState, $interaction, $M9Chart) => {
          const { angle: nowAngle, rotationAngle: nowRotationAngle } = $CurrentState
          const { radius, angle1, rotationAngle } = $interaction
          const _PiePath = { radius, startAngle: angle1, endAngle: nowAngle, color: Pie.pieColors[index % Pie.pieColors.length], rotationAngle: nowRotationAngle }
          Magnification += 0.05
          U$Push_Pop_Ctx2D($M9Chart.ctx, this.draw, _PiePath)
        }
        const _isStop = ($CurrentState, $TargetState) => {
          const { angle: nowAngle, rotationAngle: nowRotationAngle }  = $CurrentState
          const { angle: endAngle, rotationAngle: endRotationAngle } = $TargetState
          const isStop = nowAngle > endAngle && nowRotationAngle > endRotationAngle
          return isStop
        }
        const _calcNextState = ($TargetState, $CurrentState, $Interaction, $M9Chart) => {
          const { angle: nowAngle, rotationAngle: nowRotationAngle } = $CurrentState
          const { angle: AG, rotationAngle: RAG } =  $TargetState
          
          let nextAngle = nowAngle + Magnification
          nextAngle = nextAngle < AG ? nextAngle : AG
          let nextRotationAngle = nowRotationAngle + Magnification
          nextRotationAngle = nextRotationAngle < RAG ? nextRotationAngle : RAG

          const _nextState = {
            angle: nextAngle,
            rotationAngle: nextRotationAngle
          }
          if (nowAngle === AG && nowRotationAngle === RAG) {
            _nextState.angle = AG + 1
            _nextState.rotationAngle = RAG + 0.1
          }
          return _nextState
        }
        const _done = ($M9Chart, $interaction) => {
          U$Push_Pop_Ctx2D($M9Chart.ctx, this.drawLineTip, $interaction)
        }
        Interactor._StartAnimation_(__interaction, ({ startState: _startState, endState: _endState, beforeAnimating: _beforeAnimating, ctxWithCurrentState: _ctxWithCurrentState, isStop: _isStop, calcNextState: _calcNextState, M9WhisperComeTrue: $ct, done: _done }) as any)
      })
    })
    M9Whisper.$do()
  }

  // * 绘制折线式辅助语提示线
  drawLineTip ($ctx: CanvasRenderingContext2D, $path: M9PathT) {
    // 难点: 寻找一扇形的中心对称轴的中点 + 解析中点坐标
      // .condition -> 1. R::半径; 2. C::弦长; 3. L::弧长 4. A::角度(注意不是弧度)
      // .calc -> 弧长计算公式:: L = 2 * πR * A / 360
      // .calc -> 弦长计算公式:: D = 2 * R * sin(A / 2)
      // .calc: 质心(中心)计算公式:: O = 2RC/3L
      //
      const { label, radius: R, angle2: A, rotationAngle } = ($path as any)
      if ((!A && !isM9Number(A)) || !label || (!rotationAngle && !isM9Number(rotationAngle))) return
      const D = 2 * R! * H_sin(Pie.U$ConvertAngleToRadian(A / 2)) // * ) 计算弦长.D
      const L = _2PI * R! * A / 360 // * ) 计算弧长.L
      const _O_ = H_ceil((2 * R! * D) / (3 * L)) // * ) 计算质心长度._O_

      $ctx.lineWidth = 2
      $ctx.font = '14px _'
      $ctx.fillStyle = '#3dd68c'
      $ctx.strokeStyle = 'orange'

      $ctx.beginPath()
      // # 不管画哪个扇形的折线提示语, 先把画笔移动到圆心位置
      $ctx.lineTo(0, 0)
      // # 然后, 移动画笔到当前扇形的质心位置 (这两步移动的两个点, 即圆心与质心项链起来的线段就是第一段折线)
      // $ctx.lineTo(_O_, 0)
      // ! 再然后, 第二段折线, 需要根据所属象限位置, 绘制折出去的方向(无非就是 -> 左折向 | 右折向)
      // ! 有个关键点儿 - 先把整个画布反向旋转回去, 要不当前画布是已经旋转后的上下文了, 二段会画歪
      // $ctx.rotate(-rotationAngle)

      const secondLineLength = 180 // ? 二段折线长度
      const verticalOffsetBetweenLabelAndLine = 5 // ? 文字与二段折线间的纵向间距距离
      const labelOffsetWidth = $ctx.measureText(label).width

      // * 计算当前扇形质心所属象限
      const isWhereQuadrant = this.__isInM9Area__({}, $path, true)
      switch (isWhereQuadrant) {
        case '1st':
          // ? 在第一象限中
          // ! 计算中心(x, y)坐标
          const a1 = Pie.U$ConvertAngleToRadian(H_abs(360 - (A / 2 + rotationAngle)))
          const O1x = _O_ * H_sin(H_abs(HALF_PI - a1))
          const O1y = _O_ * H_sin(a1)
          $ctx.lineTo(O1x, -O1y)
          $ctx.lineTo(O1x + secondLineLength, -O1y)
          $ctx.fillText(label, O1x + secondLineLength - labelOffsetWidth, -O1y - verticalOffsetBetweenLabelAndLine)
          break
        case '2nd':
          // ? 在第二象限中
          // ! 计算中心(x, y)坐标
          const a2 = Pie.U$ConvertAngleToRadian(H_abs(270 - (A / 2 + rotationAngle)))
          const O2x = _O_ * H_sin(a2)
          const O2y = _O_ * H_sin(H_abs(HALF_PI - a2))
          $ctx.lineTo(-O2x, -O2y)
          $ctx.lineTo(-(O2x + secondLineLength), -O2y)
          $ctx.fillText(label, -(O2x + secondLineLength), -O2y - verticalOffsetBetweenLabelAndLine)
          break
        case '3rd':
          // ? 在第三象限中
          // ! 计算中心(x, y)坐标
          const a3 = Pie.U$ConvertAngleToRadian(H_abs(180 - (A / 2 + rotationAngle)))
          const O3x = _O_ * H_sin(H_abs(HALF_PI - a3))
          const O3y = _O_ * H_sin(a3)
          $ctx.lineTo(-O3x, O3y)
          $ctx.lineTo(-(O3x + secondLineLength), O3y)
          $ctx.fillText(label, -(O3x + secondLineLength), O3y - verticalOffsetBetweenLabelAndLine)
          break
        case '4th':
          // ? 在第四象限中
          // ! 计算中心(x, y)坐标
          const a4 = Pie.U$ConvertAngleToRadian(H_abs(90 - (A / 2 + rotationAngle)))
          const O4x = _O_ * H_sin(a4)
          const O4y = _O_ * H_sin(H_abs(HALF_PI - a4))
          $ctx.lineTo(O4x, O4y)
          $ctx.lineTo(O4x + secondLineLength, O4y)
          $ctx.fillText(label, O4x + secondLineLength - labelOffsetWidth, O4y - verticalOffsetBetweenLabelAndLine)
          break
      }

      $ctx.stroke()
  }

  buildingPaths (_M9CALL_) {
    const { M9, dataset } = this
    console.log('🚀 ~ file: m9._pie_:141 ~ Pie ~ buildingPaths ~ dataset:', dataset)
    // ? .eg - dataset = [{ value: 12, label: '折纸' }, { value: 25, label: '狂三' }, { value: 40, label: '美九' }, { value: 5, label: '琴里' }]
    
    const totalPieV = dataset.reduce(($caculator, pieData) => {
      const { value: pieV } = pieData
      return $caculator + pieV
    }, 0)

    let _offsetRotationAngle = 0

    const _M9PiePaths = dataset.map((pieData, _index) => {
      const { value: pieV, label: pieTitle } = pieData
      const _percentage = pieV / totalPieV // H_ceil(pieV / totalPieV * _precision) / _precision
      const _calcAngle = _360 * _percentage
      const angle1 = _offsetRotationAngle // ! 0 // ? - startAngle
      // const angle2 = _offsetRotationAngle + _calcAngle // H_ceil(_calcAngle * _precision) / _precision // ? - endAngle

      const _M9PiePath = {
        angle1,
        angle2: _calcAngle,
        label: pieTitle,
        percentage: _percentage,
        rotationAngle: _offsetRotationAngle,
        radius: this._radius, // ? 每个饼图的半径参数, - 可以再后期二创 "南丁格尔玫瑰图" 时候, 细细研究是咋变化的
        n: _index, // ?图形形状 Path 索引
        core: pieV, // ?图形核心参数 - 用户传递的那个最关键状态值
      }
      
      _offsetRotationAngle += _calcAngle
      return _M9PiePath
    })

    return _M9PiePaths
  }

  draw ($ctx: CanvasRenderingContext2D, $path: M9PathT) {
    const { color, radius, startAngle, endAngle, rotationAngle } = ($path as any)
    if (
      (!isM9Number(radius) && !radius)
      ||
      !color
      ||
      (!isM9Number(rotationAngle) && !rotationAngle)
      ||
      (!isM9Number(endAngle) && !endAngle)
    ) return
    const { x0, y0 } = this._pointAtCenter
    const CoordinatePointX = 0
    const CoordinatePointY = 0

    // ! 以下设置 -> 防止出现锯齿状 OvO 好像没啥用 OvO <-
    $ctx.imageSmoothingQuality = "high";     // 高质量的平滑度

    $ctx.beginPath()
  
    $ctx.fillStyle = color
    $ctx.lineWidth = 10
    $ctx.strokeStyle = 'black'

    const _rotationRadian = Pie.U$ConvertAngleToRadian(rotationAngle)
    // ! 我焯了 - 这个 rotate 必须放在路径绘制之前, 被折磨两天了 - 居然是这原因 [OvO]
    $ctx.rotate(_rotationRadian)

    $ctx.lineTo(radius, 0)
    const _endRadian = Pie.U$ConvertAngleToRadian(endAngle) // # H_floor(_2PI * percentage * Pie.precision) / Pie.precision
    $ctx.arc(CoordinatePointX, CoordinatePointY, radius, 0, _endRadian, false)
    $ctx.lineTo(0, 0)
    
    $ctx.fill()
    $ctx.stroke()
  }

  __isInM9Area__ ($point, $interaction, $isFromEventClickOrM9Self = false) {
    const { x, y } = $point
    // const { x0, y0 } = this._pointAtCenter
    const x0 = 0
    const y0 = 0
    const { radius: _radius, angle1: _angle1, angle2: _angle2, rotationAngle } = $interaction
    if ($isFromEventClickOrM9Self) {
      const a = H_floor(_angle2 / 2 + rotationAngle)
      if (0 < a && a <= 90) {
        return '4th'
      } else if (90 < a && a <= 180) {
        return '3rd'
      } else if (180 < a && a <= 270) {
        return '2nd'
      } else if (270 < a && a <= 360) {
        return '1st'
      }
    }
    // 计算 事件坐标点 是否在 圆弧曲线范围内部
    const calcThisCurve = ($x, $y) => H_pow($x - x0, 2) + H_pow($y - y0, 2)
    // 计算 事件坐标点 与 圆心围成的弧度角度 是否在 起止角度之间
    const calcThisAngle = ($x, $y) => {
      const halfCanvasLength = y0
      const _angle0 =
      H_sin(
        (halfCanvasLength - $y)
          /
        H_sqrt(
          H_pow(H_abs($x - halfCanvasLength))
            +
          H_pow(H_abs($y - halfCanvasLength))
        )
      )
      let _isin = false
      
      if ($x > x0 && $y > y0) {
        // ? 第一象限
        const correctAngle = PI - (_angle1 - (PI - _angle2))
        _isin = _angle0 < correctAngle
      } else if ($x < x0 && $y > y0) {
        // ? 第二象限
        const correctAngle = _angle1 - (PI - _angle2)
        _isin = _angle0 < correctAngle
      } else if ($x < x0 && $y < y0) {
        // ? 第三象限
        const correctAngle = PI - _angle2
        _isin = _angle0 < correctAngle
      } if ($x > x0 && $y < y0) {
        // ? 第四象限
        const correctAngle = _angle2
        _isin = _angle0 > correctAngle
      }

      return _isin
    }

    const isInCircleArea =
      calcThisCurve(x, y) <= H_pow(_radius, 2)
      &&
      calcThisAngle(x, y)

    return isInCircleArea
  }
}

export default Pie