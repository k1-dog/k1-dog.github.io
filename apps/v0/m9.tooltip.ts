
import { M9Chart as M9ChartT } from './m9'
import { _defaultGap } from './helper.options'

/**
 * @description [美九未来 - 气泡提示框 位置探测器]
 */

// ! 想了一段时间, 还是想用 html 元素实现工具提示框
// * 不太理解 chartjs 为什么仍选择用 canvas 渲染工具提示框 实现过于繁琐

/**
 * @class M9Tooltip
 * @description [美九未来 - 图表库 全局气泡提示框绘制工具类]
 */
export default class M9Tooltip {

  static tooltipOffset = { ..._defaultGap }
  M9Chart: M9ChartT

  toolTitle: string // ? 提示标题
  toolContent: string // ? 提示内容
  _tooltipElement: HTMLElement // ? 工具提示 - 真实元素
  toolEvent: ($ev: MouseEvent) => void // ? 提示事件

  _running: boolean = false // ? 当前工具提示类实例 - 显示状态 [开 | 关]

  constructor($M9Chart: M9ChartT) {

    this.M9Chart = $M9Chart
    this._tooltipElement = document.createElement('div')
    this._tooltipElement.setAttribute('class', 'm9-tooltip')

    this.toolEvent = (ev: MouseEvent) => {
      const { offsetX, offsetY } = ev
      // 是否在探测器 侦测到的有效范围内 <? 注意减去 - 画布横纵偏移量 ?>
      const { X_OFFSET, Y_OFFSET } = M9Tooltip.tooltipOffset
      const barXTailLen = 5
      const _point = {
        x: offsetX - X_OFFSET + barXTailLen,
        y: offsetY + Y_OFFSET
      }
      
      const _isInM9Area =this.M9Chart._M9Interactor._isInLocation(_point, null)
      if (_isInM9Area) {
        const [_interaction, _targetAnimation] = _isInM9Area
        this.__summon_tool__(_interaction)
        this._running = true
      } else if (this._running) {
        this.__unsummon_tool__()
        this._running = false
      }
    }
    
    this.__init__()
  }

  // # 初始化
  __init__ () {
    this.__want_its_tool__()
    // * M9-Chart 图表元素 本身失焦或鼠标移出时, 隐藏tooltip提示框
    this.M9Chart.canvas.addEventListener('mouseleave', () => {
			this.$hide()
    })
  }

  // ! 让 M9-Chart-父元素容器 添加该 tooltip 实例对应子元素 - 以便利用相对、绝对定位, 快速安放工具提示框的位置
  __LinkM9__ () {
    this.M9Chart.m9Container.appendChild(this._tooltipElement)
  }
  __unLinkM9__ () {
    this.M9Chart.m9Container.removeChild(this._tooltipElement)
  }

  // ? 绑定 文本提示 事件
  __want_its_tool__ () {
    this.M9Chart.canvas.addEventListener('mousemove', this.toolEvent)
  }
  // ? 移除 文本提示 事件
  __unwant_its_tool__ () {
    this.M9Chart.canvas.removeEventListener('mousemove', this.toolEvent)
  }
  // ! 召唤 文本提示
  __summon_tool__ ($interaction) {
    const { core, l, t } = $interaction
    const xLabel = '鸢一折纸' // ? title
    const yLabel = core // ? content
    this.toolTitle = xLabel
    this.toolContent = yLabel
    
    this._running === false && this.__clean_tool__()
    const { X_OFFSET, Y_OFFSET } = M9Tooltip.tooltipOffset
    this.$show(l + X_OFFSET / 2, t - Y_OFFSET / 2)
  }
  // ! 反召 文本提示
  __unsummon_tool__ () {
    this.__clean_tool__()
    this.$hide()
  }
  // * 清空工具提示框
  __clean_tool__ () {
    this._tooltipElement.innerHTML = ''
  }

  $hide () {
    this._tooltipElement.style.opacity = '0'
  }

  $show ($left: number, $top: number) {
    // * 1. 绘制背景 (边框) <+> (颜色)
    // * 2. 绘制文本 (title - 标题) <+> (text - 内容)
    this._tooltipElement.innerHTML = `
      <div class="m9-tooltip__title"><strong>${this.toolTitle}</strong></div>
      <div class="m9-tooltip__content"><strong>${this.toolContent}</strong></div>
    `
    let _TxTooltip: number | null | undefined = window.setTimeout(() => {
      const { width: toolW, height: toolH } = this._tooltipElement.getBoundingClientRect()
      this._tooltipElement.style.left = $left + 'px'
      this._tooltipElement.style.top = $top - toolH - 10 + 'px'
      this._tooltipElement.style.opacity = '1'
      window.clearTimeout(_TxTooltip as number)
      _TxTooltip = null
    })
    
  }
}