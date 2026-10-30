/**
 * const — 全局常量表（纯值；派生量只定义一次）
 */

// —— 数学 ——
const TAU = Math.PI * 2

// —— 填充透明度 ——
const FILL_α = {
  pie: 100,
  rect: 140,
  radar: 40,
}

// —— 动画 ——
const ANIM_STEP = 0.06

// —— 坐标系 ——
const VALUE_MAX_EXPAND = 1.2
const RADAR_LABEL_PAD = 24
const RADAR_LABEL_OFFSET = 14

// —— 交互 ——
const HOVER_SCALE = 1.05
const STROKE_NORMAL = 2
const STROKE_LOCKED = 4
const ARC_GAP_EPS = 0.01
const RING_WIDTH_RATIO = 0.14

// —— 视角控制（滚轮推拉 + 拖拽环绕）——
const ZOOM_STEP = 0.0016
const ZOOM_MIN = 0.3
const ZOOM_MAX = 5
const ORBIT_TURN_STEP = 0.004
const ORBIT_TILT_STEP = 0.004

// —— 脏域 ——
const DIRTY_PAD_RATIO = 1.15
const DIRTY_PAD_PX = 4

// —— 网格背景 ——
const GRID_STYLE = {
  stroke: 'rgba(200, 200, 200, 0.3)',
  lineWidth: 1,
  labelFill: 'rgba(150, 150, 150, 0.7)',
  labelFont: '10px sans-serif',
  xLabelOffsetY: 14,
  yLabelOffsetX: 4,
  yLabelOffsetY: 2,
  yLabelDecimals: 0,
} as const
const RADAR_GRID_LAYERS = 4
const POLAR_GRID_RAYS = 8
const AXIS_TICKS = 5
const LABEL_AXIS_THRESHOLD = 0.5

// —— tooltip ——
const TOOLTIP = {
  offset: 12,
  offsetTop: 6,
  minW: 80, minH: 40,
  cssText: [
    'position: absolute',
    'padding: 6px 10px',
    'background: rgba(0, 0, 0, 0.8)',
    'border-radius: 4px',
    'color: antiquewhite',
    'font-size: 12px',
    'pointer-events: none',
    'opacity: 0',
    'transition: opacity 0.2s ease',
    'white-space: nowrap',
    'z-index: 9999',
  ].join(';'),
  valueDecimals: 2,
} as const

// —— 模型 ——
const DEFAULT_CAP = 1024
const AABB_HIT_PAD = 4
const GEO_SLOTS_EACH_ELEM = 5
const ARC_START_ANGLE = -Math.PI / 2
const DEFAULT_BAR_W = 30
/** 默认分组键 — RoadRule.by 缺省读取的 element 字段 */
const DEFAULT_GROUP_KEY = 'grp'
const TEXT_DEFAULT_SIZE = 14

// —— 空间索引 ——
const DEFAULT_CELL_SIZE = 64
const HIT_TOLERANCE = 10

// —— scheduler ——
const TICK_MS = 16

// —— toolbar（画布右缘竖条）——
const TOOLBAR = {
  btnSize: 26,
  svgSize: 15,
  /** 状态点颜色 — 按图表状态 */
  statusColors: {
    idle: '#9e9e9e',
    growing: '#4da3ff',
    done: '#4caf50',
    paused: '#ff9800',
  } as const,
  cssText: [
    'position: absolute',
    'right: 0',
    'top: 50%',
    'transform: translateY(-50%)',
    'display: flex',
    'flex-direction: column',
    'gap: 4px',
    'padding: 4px',
    'background: rgba(18, 22, 34, 0.85)',
    'border: 1px solid rgba(255, 255, 255, 0.08)',
    'border-radius: 8px 0 0 8px',
    'z-index: 9998',
  ].join(';'),
  btnCssText: [
    'width: 26px',
    'height: 26px',
    'padding: 0',
    'display: flex',
    'align-items: center',
    'justify-content: center',
    'border: none',
    'border-radius: 6px',
    'background: transparent',
    'color: #b8c2d9',
    'cursor: pointer',
    'position: relative',
  ].join(';'),
  btnActiveCss: 'background: rgba(77, 163, 255, 0.25); color: #4da3ff',
  btnOffCss: 'opacity: 0.35; cursor: not-allowed',
  dotCssText: [
    'position: absolute',
    'top: 2px',
    'right: 2px',
    'width: 7px',
    'height: 7px',
    'border-radius: 50%',
    'pointer-events: none',
  ].join(';'),
  cardCssText: [
    'position: absolute',
    'right: 44px',
    'top: 50%',
    'transform: translateY(-50%)',
    'padding: 8px 12px',
    'background: rgba(18, 22, 34, 0.92)',
    'border: 1px solid rgba(255, 255, 255, 0.08)',
    'border-radius: 6px',
    'color: #dce3f2',
    'font-size: 12px',
    'line-height: 1.7',
    'white-space: nowrap',
    'z-index: 9999',
  ].join(';'),
  itemCssText: [
    'display: block',
    'width: 100%',
    'padding: 3px 8px',
    'border: none',
    'border-radius: 4px',
    'background: transparent',
    'color: #b8c2d9',
    'font-size: 12px',
    'text-align: left',
    'cursor: pointer',
  ].join(';'),
  itemActiveCss: 'background: rgba(77, 163, 255, 0.18); color: #dce3f2',
  /** 面向用户的状态文案（UI 文本） */
  statusLabels: {
    idle: '未进行',
    growing: '持续月读中',
    done: '已完成',
    paused: '已暂停',
  } as const,
} as const

// —— evolve 残影域（纯 DOM、tick 管线之外）——
const EVOLVE = {
  /** 快照时在形状 bbox 外多抓的像素 */
  snapPad: 2,
  minSize: 2,
  /** 边缘区宽度 — 光标进入即抓取拉伸（px） */
  edgeZone: 8,
  /** 位移小于此值按点击不按拖拽（px） */
  clickEps: 3,
  /** 版本快照缩略图宽（px） */
  snapWidth: 160,
  selectCssText: [
    'position: absolute',
    'border: 1px dashed rgba(77, 163, 255, 0.9)',
    'border-radius: 2px',
    'pointer-events: none',
    'display: none',
    'z-index: 9990',
  ].join(';'),
  ghostCssText: [
    'position: absolute',
    'opacity: 0.85',
    'border: 1px dashed rgba(255, 255, 255, 0.6)',
    'pointer-events: none',
    'display: none',
    'z-index: 9991',
  ].join(';'),
  indicatorCssText: [
    'position: absolute',
    'width: 2px',
    'background: #4da3ff',
    'border-radius: 1px',
    'pointer-events: none',
    'display: none',
    'z-index: 9993',
  ].join(';'),
  /** ✓ 确认 / ✗ 丢弃条 — staged 挂起期间悬浮画布顶部 */
  confirmCssText: [
    'position: absolute',
    'left: 50%',
    'top: 8px',
    'transform: translateX(-50%)',
    'display: none',
    'gap: 6px',
    'padding: 4px',
    'background: rgba(18, 22, 34, 0.9)',
    'border: 1px solid rgba(255, 255, 255, 0.12)',
    'border-radius: 8px',
    'z-index: 9995',
  ].join(';'),
  confirmBtnCssText: [
    'padding: 3px 12px',
    'border: none',
    'border-radius: 6px',
    'font-size: 12px',
    'cursor: pointer',
    'background: transparent',
  ].join(';'),
  /** 版本缩略图预览 — hover 时弹于历史卡左侧 */
  previewCssText: [
    'position: absolute',
    'padding: 6px',
    'background: rgba(18, 22, 34, 0.92)',
    'border: 1px solid rgba(255, 255, 255, 0.08)',
    'border-radius: 6px',
    'z-index: 9999',
    'pointer-events: none',
    'display: flex',
    'flex-direction: column',
    'gap: 4px',
    'color: #b8c2d9',
    'font-size: 12px',
    'text-align: center',
  ].join(';'),
} as const

// —— mugen（無限月读天幕 — paint 自绘层 屏幕锚定）——
const MUGEN = {
  /** 月亮中心与半径（视口比例 r 按 min(w,h)） */
  moonX: 0.14,
  moonY: 0.16,
  moonR: 0.1,
  /** 三勾玉内圈半径比 / 勾玉点半径比 */
  tomoeR: 0.52,
  tomoeDot: 0.1,
  /** 地平线高度（视口比例） */
  horizonY: 0.76,
  /** 立绘脚底锚点（视口比例）与身高（视口高度比） */
  figX: 0.86,
  figH: 0.34,
  moonCore: 'rgba(255, 118, 100, 0.95)',
  moonHalo: 'rgba(150, 22, 30, 0.55)',
  moonEdge: 'rgba(60, 8, 16, 0)',
  tomoeFill: 'rgba(42, 4, 10, 0.85)',
  horizonStroke: 'rgba(255, 140, 120, 0.5)',
  groundFill: 'rgba(26, 10, 14, 0.9)',
  groundDeep: 'rgba(12, 4, 8, 0.95)',
  reflectTop: 'rgba(255, 118, 100, 0.3)',
  reflectBottom: 'rgba(255, 118, 100, 0)',
  figureFill: 'rgba(16, 8, 16, 0.96)',
  /** 轮廓光 — 深色天幕上的可辨性（写轮眼红光） */
  figureStroke: 'rgba(255, 118, 100, 0.55)',
  /** 单位身形下的轮廓线宽（约 1px 等效） */
  figLineWidth: 0.012,
  /** 立绘分组填充 — 后发与前发最暗 面部暖暗 甲胄居中 */
  hairFill: 'rgba(8, 4, 10, 0.98)',
  faceFill: 'rgba(104, 48, 42, 0.96)',
  /** 细节刻线 — 只描边不填充（眉眼嘴 发丝 甲缝 扇骨） */
  figureDetail: 'rgba(255, 150, 130, 0.32)',
  figDetailWidth: 0.007,
} as const

// —— retina ——
const DPR_MAX = 3

// —— 曲线 ——
const CURVE_NORMAL_RATIO = 0.2
/** 缺省弯度像素上限 — 段长比例弯度在长段（回绕闭合 / 跨云桥接）上会鼓成巨弧 */
const CURVE_BEND_MAX_PX = 24

// —— 3D 渲染（世界单位 = CSS px）——
const C3D = {
  THICK_BAR: 24,
  THICK_LINE: 8,
  SECTOR_SEGS: 24,
  FIT_MARGIN: 1.0,
  FOV: (55 * Math.PI) / 180,
  TILT_BASE: 0.55,
  TILT_MIN: -0.35,
  TILT_MAX: 1.2,
  TURN_BASE: -0.5,
  LIGHT: [0.5, 1.0, 0.35],
  AMBIENT: 0.45,
  CLEAR: [0.03, 0.06, 0.13, 1.0],
  ALPHA_MUL: 0.12,
  RIM_I: 1.0,
  NEON_CYAN: [0.36, 0.78, 1.0],
  NEON_TINT: 0.35,
  GROUND_CELL: 40,
  GROUND_GLOW: 0.5,
  GROUND_MARGIN: 1.12,
} as const

/** 挤出半厚 — 由 THICK_BAR 派生一次 */
const HALF_EXTRUDE_Z = C3D.THICK_BAR / 2

// —— WebGPU 资源 ——
const GPU = {
  USAGE_STORAGE_DST: 0x80 | 8,
  USAGE_UNIFORM_DST: 0x40 | 8,
  USAGE_RENDER_ATTACH: 0x10,
  MSAA_SAMPLES: 4,
  BOX_VERTS: 36,
  GROUND_VERTS: 6,
  SECTOR_VERTS_PER_SEG: 12,
  SCENE_UNIFORM_FLOATS: 32,
} as const

/** 扇区顶点总数 = 每段顶点数 × 段数 + 端帽 */
const SECTOR_VERTS = C3D.SECTOR_SEGS * GPU.SECTOR_VERTS_PER_SEG + GPU.SECTOR_VERTS_PER_SEG

export {
  TAU,
  C3D,
  HALF_EXTRUDE_Z,
  SECTOR_VERTS,
  FILL_α,
  ANIM_STEP,
  VALUE_MAX_EXPAND,
  RADAR_LABEL_PAD,
  RADAR_LABEL_OFFSET,
  ZOOM_STEP,
  ZOOM_MIN,
  ZOOM_MAX,
  ORBIT_TURN_STEP,
  ORBIT_TILT_STEP,
  HOVER_SCALE,
  STROKE_NORMAL,
  STROKE_LOCKED,
  ARC_GAP_EPS,
  RING_WIDTH_RATIO,
  DIRTY_PAD_RATIO,
  DIRTY_PAD_PX,
  GRID_STYLE,
  RADAR_GRID_LAYERS,
  POLAR_GRID_RAYS,
  AXIS_TICKS,
  LABEL_AXIS_THRESHOLD,
  TOOLTIP,
  DEFAULT_CAP,
  AABB_HIT_PAD,
  GEO_SLOTS_EACH_ELEM,
  ARC_START_ANGLE,
  DEFAULT_BAR_W,
  DEFAULT_GROUP_KEY,
  TEXT_DEFAULT_SIZE,
  DEFAULT_CELL_SIZE,
  HIT_TOLERANCE,
  TICK_MS,
  DPR_MAX,
  MUGEN,
  TOOLBAR,
  EVOLVE,
  CURVE_NORMAL_RATIO,
  CURVE_BEND_MAX_PX,
  GPU,
}
