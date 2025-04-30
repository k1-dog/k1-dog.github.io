import M9Tooltip from './m9.tooltip'
import { _noop } from './helper.core'
import { _limit } from './helper.math'
import M9Interactor from './m9.interactor'
import { _defaultGap } from './helper.options'
import { M9Interactor as InteractorClassT, M9TooltipT } from './m9'
import { _DeviceRatioBuilding } from './helper.canvas'
import Bar from './m9._bar_'
import Pie from './m9._pie_'


/**
 * @type { M9_StarWalk } M9-星驰引擎 极致图表数据渲染优化 高效性能体验
 * @description [核心思想 - 业内统称 "抽取" -大数据可视化时, 显然全部可视化出来既不现实也没意义, 每次只抽离部分有效数据去可视化]
 */
function M9_StarWalker () {
  0
}

// 骨架屏-过渡时间
const _defaultInitT = 500 // ms

// 画-x-轴 <- xScales
const xScales = [30, 50, 80, 140, 250]
// 画-y-轴 <- yScales
const yScales = [5, 20, 60, 150, 280]
// 画-饼图- 数据集 dataset
const pieDataset = [
  { value: 12, label: '折纸' }, { value: 25, label: '狂三' }, { value: 30, label: '美九' },
  { value: 5, label: '琴里' }, { value: 16, label: '大师' }, { value: 10, label: '神奈川七罪' }
]

var colorSet = []

export default function ($DomRef) {

  /**
   * @type { M9 } M9-Charts 图表控制器
   */
  class M9 {
    static M9Controllers = {
      Bar,
      Pie
    }

    width: number
    height: number

    canvas: HTMLCanvasElement
    m9Container: HTMLDivElement
    ctx: CanvasRenderingContext2D
    _M9Interactor: InteractorClassT
    _M9Tooltip: M9TooltipT
    __controller: any
    $TYPE: 'Bar' | 'Pie' | 'Line' | 'Radar'

    constructor ($config) {
      this.U$InitConfig($config)
      this.U$Booting()
    }

    U$InitConfig ($config) {
      const _$config = {
        M9: this,
        width: 500,
        height: 500,
        type: $config.type || 'Bar',
        ...$config
      }

      const { width, height, type } = _$config

      this.$TYPE = type
      this.width = width// + _defaultGap.X_OFFSET
      this.height = height// + _defaultGap.Y_OFFSET

      const M9Container = document.createElement('div')
      M9Container.setAttribute('class', 'm9')
      const $canvas = document.createElement('canvas')
      M9Container.appendChild($canvas)
      $DomRef && $DomRef.appendChild(M9Container)

      const _ctx = $canvas.getContext('2d')!
      // 默认 - 每次绘制新图形时, 层级会降低, 防止覆盖原有图像
      _ctx.globalCompositeOperation = 'destination-over'

      this.ctx = _ctx
      this.canvas = $canvas
      this.m9Container = M9Container

      this.__controller = new M9.M9Controllers[type](_$config)
      // 根据设备像素比 - 主动调节视网膜视窗观感
      _DeviceRatioBuilding(this)
    }

    U$Booting () {
      // M9 - 关联位置范围探测器, 记录画布上核心图形与自身位置的对应关系
      this._M9Interactor = new M9Interactor(this)
      this._M9Tooltip = new M9Tooltip(this)
      this._M9Tooltip.__LinkM9__()

      // --- 后续统一整合: 图形绘制逻辑 all in M9Element.__M9PathsBuilding__()
      const m9Paths = this.__M9PathsBuilding__()
      m9Paths.forEach($m9path => this._M9Interactor._sniffing_($m9path))
      this._M9Interactor._Animations_() // 绑定位置对象 - 对应 - 动画处理器
    }

    __M9PathsBuilding__ () {
      return this.__controller.buildingPaths(_noop)
    }

    __draw__ () {
      this.__controller["__" + this.$TYPE + "__"](this._M9Interactor)
    }

    __destroy__ () {
      // ? this._animation.__kill__()
      // ? this._interactor.__kill__()
      // ? this._controller.__kill__()
    }
  }

  const M9Bar = new M9({ xScales, yScales, type: 'Bar' })
  M9Bar.__draw__()
  const M9Pie = new M9({ dataset: pieDataset, type: 'Pie', width: 700, height: 700 })
  M9Pie.__draw__()
  
  return function (call = _noop) {
    M9Bar.__destroy__()
    call && call()
  }
}

  // 美九Charts - 饼状图 <Pie> 构造器
  // function Pie ($ctx) {
  //   2
  // }
  
  // 美九Charts - 雷达图 <Radar> 构造器1
  // function Radar ($ctx) {
  //   3
  // }