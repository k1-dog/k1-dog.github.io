/**
 * const — 全局常量配置（纯常量零运行时；派生量单点定义）
 */

// —— 数学 ——
const TAU = Math.PI * 2            // 圆周角

// —— 填充透明度 ——
const FILL_α = {
  pie_α: 100,
  rect_α: 140,
  radar_α: 40
}

// —— 动画 ——
const ANIM_STEP = 0.06           // 每帧 anim 推进步长

// —— 坐标系 ——
const VALUE_MAX_EXPAND = 1.2     // valueMax 上扩比例
const RADAR_LABEL_PAD = 24       // 雷达半径留白（标签位）
const RADAR_LABEL_OFFSET = 14    // 雷达标签距轴线末端偏移

// —— 交互 ——
const HOVER_SCALE = 1.05         // hover 缩放比例
const STROKE_NORMAL = 2          // 正常描边宽
const STROKE_LOCKED = 4          // 锁定描边宽
const ARC_GAP_EPS = 0.01         // 扇形间隙 epsilon

// —— 视线交互（滚轮推拉 + 拖拽绕转）——
const ZOOM_STEP = 0.0016         // 每像素 deltaY → 缩放因子（一格 ≈ ×1.17）
const ZOOM_MIN = 0.3             // 拉远极限
const ZOOM_MAX = 5               // 推近极限
const ORBIT_TURN_STEP = 0.004    // 每像素 dx → 偏航弧度（250px ≈ 1rad）
const ORBIT_TILT_STEP = 0.004    // 每像素 dy → 俯仰弧度（2D 即 gazeY 平移比例）

// —— 脏区域 ——
const DIRTY_PAD_RATIO = 1.15     // 扩张比例（覆盖 hover 缩放残影）
const DIRTY_PAD_PX = 4           // 扩张像素（覆盖描边）

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
const RADAR_GRID_LAYERS = 4      // 雷达同心层数
const POLAR_GRID_RAYS = 8        // 极坐标辐射线数
const Y_AXIS_TICKS = 5           // Y 轴刻度数
const LABEL_AXIS_THRESHOLD = 0.5 // |cos|/|sin| 超过即视为轴向

// —— tooltip ——
const TOOLTIP = {
  offset: 12,
  offsetTop: 6,
  minW: 80, minH: 40,            // 空测量回退
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
const DEFAULT_CAP = 1024         // SoA 初始容量
const AABB_HIT_PAD = 4           // AABB 命中 padding
const GEO_SLOTS_EACH_ELEM = 3    // aux 槽位/元素：[r, startAng, endAng]
const ARC_START_ANGLE = -Math.PI / 2  // 弧起始角（12点钟方向）
const DEFAULT_BAR_W = 30         // 默认柱宽
const TEXT_DEFAULT_SIZE = 14     // Text 默认字号

// —— 空间索引 ——
const DEFAULT_CELL_SIZE = 64     // 哈希网格 cell 尺寸

// —— 调度器 ——
const TICK_MS = 16               // 单 tick 时长（lockstep）

// —— 视网膜 ——
const DPR_MAX = 3                // DPR 上限

// —— 曲线 ——
const CURVE_NORMAL_RATIO = 0.2   // 法向量偏移系数

// —— 3D 渲染（世界系单位 = CSS px；相机数学见 camera3.ts）——
const C3D = {
  // 几何
  THICK_BAR: 24,                 // 柱体挤出厚度（Z 向）
  THICK_LINE: 8,                 // 线盒横截面厚度
  SECTOR_SEGS: 24,               // 扇段外弧细分段数
  // 取景（楼宇大屏视角：贴满视锥 + 陡倾角 + 强侧转）
  FIT_MARGIN: 1.0,               // 内容占满视锥
  FOV: (55 * Math.PI) / 180,     // 竖直视锥角
  TILT_BASE: 0.55,               // 初始倾角 ≈31°
  TILT_MIN: -0.35,               // 仰视极限（钳制避开 ±90° 三轴退化）
  TILT_MAX: 1.2,                 // 俯视极限
  TURN_BASE: -0.5,               // 侧转角 ≈29°（保留透视纵深）
  // 光照与清屏
  LIGHT: [0.5, 1.0, 0.35],       // 平行光方向（fs 内归一化）
  AMBIENT: 0.45,                 // 环境光占比
  CLEAR: [0.03, 0.06, 0.13, 1.0], // 清屏色（深夜蓝）
  // 玻璃霓虹（叠加混合下自发光）
  ALPHA_MUL: 0.12,               // 面心透明度倍率（近全透，棱线骨架主导）
  RIM_I: 1.0,                    // 菲涅尔边缘光强度
  NEON_CYAN: [0.36, 0.78, 1.0],  // 霓虹基色（冰青）
  NEON_TINT: 0.35,               // 冷色化混合比
  // 发光地台
  GROUND_CELL: 40,               // 格距（网格距离场周期）
  GROUND_GLOW: 0.5,              // 辉光强度
  GROUND_MARGIN: 1.12,           // 柱群包围盒外扩比
} as const

/** 挤出半厚 = THICK_BAR/2 单点派生 */
const HALF_EXTRUDE_Z = C3D.THICK_BAR / 2

// —— WebGPU 资源 ——
const GPU = {
  USAGE_STORAGE_DST: 0x80 | 8,   // STORAGE | COPY_DST
  USAGE_UNIFORM_DST: 0x40 | 8,   // UNIFORM | COPY_DST
  USAGE_RENDER_ATTACH: 0x10,     // RENDER_ATTACHMENT
  MSAA_SAMPLES: 4,
  BOX_VERTS: 36,                 // 盒体 12 三角面 ×3
  GROUND_VERTS: 6,               // 地台 2 三角面 ×3
  SECTOR_VERTS_PER_SEG: 12,      // 每细分段：fan×2 + 弧壁 + 侧壁
  SCENE_UNIFORM_FLOATS: 32,      // 128B / 4
} as const

/** 扇段顶点总数 = 每段 12 × 段数 + 端帽补点 */
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
  DIRTY_PAD_RATIO,
  DIRTY_PAD_PX,
  GRID_STYLE,
  RADAR_GRID_LAYERS,
  POLAR_GRID_RAYS,
  Y_AXIS_TICKS,
  LABEL_AXIS_THRESHOLD,
  TOOLTIP,
  DEFAULT_CAP,
  AABB_HIT_PAD,
  GEO_SLOTS_EACH_ELEM,
  ARC_START_ANGLE,
  DEFAULT_BAR_W,
  TEXT_DEFAULT_SIZE,
  DEFAULT_CELL_SIZE,
  TICK_MS,
  DPR_MAX,
  CURVE_NORMAL_RATIO,
  GPU,
}
