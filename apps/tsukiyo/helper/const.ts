/**
 * const — 全局常量配置
 *
 * 纯常量，零运行时逻辑依赖，任何模块可安全导入
 * 分组原则：同类语义聚一组，派生量单点定义（如 HALF_EXTRUDE_Z）
 */

// —— 数学 ——
const TAU = Math.PI * 2            // 圆周角（全系统统一，禁散布 Math.PI*2）

// —— 填充透明度配置 ——
const FILL_α = {
  pie_α: 100,
  rect_α: 140,
  radar_α: 40
}

// —— 动画 ——
const ANIM_STEP = 0.06           // 每帧 anim 推进步长

// —— 坐标系 ——
const VALUE_MAX_EXPAND = 1.2     // valueMax 上扩比例（hover 缩放留白）
const RADAR_LABEL_PAD = 24       // 雷达半径留白（标签位）
const RADAR_LABEL_OFFSET = 14    // 雷达标签距轴线末端偏移

// —— 交互 ——
const HOVER_SCALE = 1.05         // hover 缩放比例
const STROKE_NORMAL = 2          // 正常描边宽度
const STROKE_LOCKED = 4          // 锁定描边宽度
const ARC_GAP_EPS = 0.01         // 扇形间隙消除 epsilon

// —— 视线交互（滚轮推拉 + 拖拽绕转；状态归 CoordMapper 双实现唯一持有）——
const ZOOM_STEP = 0.0016         // 滚轮推拉步进 — 每像素 deltaY 折算缩放因子（标准一格 ≈ ×1.17）
const ZOOM_MIN = 0.3             // 缩放下限（拉远极限）
const ZOOM_MAX = 5               // 缩放上限（推近极限）
const ORBIT_TURN_STEP = 0.004    // 拖拽水平绕转步进 — 每像素 dx 折算偏航弧度（250px ≈ 1rad）
const ORBIT_TILT_STEP = 0.004    // 拖拽俯仰绕转步进 — 每像素 dy 折算俯仰弧度（2D 下即 gazeY 平移比例）

// —— 脏区域 ——
const DIRTY_PAD_RATIO = 1.15     // 脏区域扩张比例（覆盖 hover 缩放残影）
const DIRTY_PAD_PX = 4           // 脏区域扩张像素（覆盖描边）

// —— 网格背景（layering 静态层绘制样式，单点配置）——
const GRID_STYLE = {
  stroke: 'rgba(200, 200, 200, 0.3)',   // 网格线颜色
  lineWidth: 1,                          // 网格线宽
  labelFill: 'rgba(150, 150, 150, 0.7)', // 刻度标签颜色
  labelFont: '10px sans-serif',          // 刻度标签字体
  xLabelOffsetY: 14,                     // X 轴标签距底边偏移
  yLabelOffsetX: 4,                      // Y 轴标签距左边界偏移
  yLabelOffsetY: 2,                      // Y 轴标签纵向微调
  yLabelDecimals: 0,                     // Y 轴刻度小数位
} as const
const RADAR_GRID_LAYERS = 4      // 雷达同心多边形层数
const POLAR_GRID_RAYS = 8        // 极坐标辐射线数
const Y_AXIS_TICKS = 5           // Y 轴刻度数
/** 轴向/斜向标签对齐阈值 — |cos|/|sin| 超过即视为轴向 */
const LABEL_AXIS_THRESHOLD = 0.5

// —— tooltip（interact 悬浮提示样式，单点配置）——
const TOOLTIP = {
  offset: 12,                    // 距鼠标偏移（主/反向定位共用）
  offsetTop: 6,                  // 上方定位额外间距
  minW: 80, minH: 40,            // 尺寸回退值（getBoundingClientRect 空测量时）
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
  valueDecimals: 2,              // value 数值小数位
} as const

// —— 模型 ——
const DEFAULT_CAP = 1024         // SoA 初始容量
const AABB_HIT_PAD = 4           // AABB 命中测试 padding
const GEO_SLOTS_EACH_ELEM = 3   // 每元素几何参数槽位数（aux: [r, startAng, endAng]）
const ARC_START_ANGLE = -Math.PI / 2  // 弧形/扇形起始角（12点钟方向）
const DEFAULT_BAR_W = 30         // 默认柱宽（默认 pointFn 用）
const TEXT_DEFAULT_SIZE = 14     // Text 原语默认字号（h 未设时回退）

// —— 空间索引 ——
const DEFAULT_CELL_SIZE = 64     // 空间哈希网格默认 cell 尺寸

// —— 调度器 ——
const TICK_MS = 16               // 单 tick 时长（lockstep）

// —— 视网膜 ——
const DPR_MAX = 3                // DPR 上限（避免极端值导致画布过大）

// —— 曲线 ——
const CURVE_NORMAL_RATIO = 0.2   // 曲线法向量偏移系数

// —— 3D 渲染（世界系单位 = CSS px，见 v/render-3d.ts 文件头公理；相机数学见 v/camera3.ts）——
const C3D = {
  // 几何
  THICK_BAR: 24,                 // 柱体挤出厚度（世界系 Z 向）
  THICK_LINE: 8,                 // 线盒横截面厚度（X/Y 向；Z 向同值）
  SECTOR_SEGS: 24,               // 饼图扇段外弧细分段数
  // 取景（宏观大气 — 楼宇大屏视角：贴满视锥 + 陡倾角 + 强侧转的透视纵深）
  FIT_MARGIN: 1.0,               // 内容占满视锥（不留白 — 紧凑小气的主因是留白过多）
  FOV: (55 * Math.PI) / 180,     // 竖直视锥角（略夸张的近大远小 = 纵深）
  TILT_BASE: 0.55,               // 初始倾角（弧度）— 0.55≈31°，楼宇大屏视角基准；拖拽俯仰由此起算
  TILT_MIN: -0.35,               // 仰视极限（负 = 抬头望楼底；钳制边界避开 ±90° 相机三轴退化）
  TILT_MAX: 1.2,                 // 俯视极限（近顶视）
  TURN_BASE: -0.5,               // 相机侧转角（弧度）— 0.5≈29°，侧转保留透视纵深；拖拽绕转由此起算
  // 光照与清屏
  LIGHT: [0.5, 1.0, 0.35],       // 平行光方向（世界系，fs 内归一化）
  AMBIENT: 0.45,                 // 环境光占比 — 拉开明暗对比（过高会压平立体感）
  CLEAR: [0.03, 0.06, 0.13, 1.0], // 清屏色 — 深夜蓝（数字孪生大屏底色，霓虹辉光的前提）
  // 玻璃霓虹（叠加混合下自发光）
  ALPHA_MUL: 0.12,               // 面心透明度倍率 — 近全透（棱线骨架主导发光，内部空间留给细节图形）
  RIM_I: 1.0,                    // 菲涅尔边缘光强度 — 掠射补轮廓（棱线接棒主导）
  NEON_CYAN: [0.36, 0.78, 1.0],  // 霓虹基色 — 冰青（智慧楼宇大屏主色调）
  NEON_TINT: 0.35,               // 冷色化混合比 — 基色向霓虹收敛度（统一色系 = 柔和感）
  // 发光地台 — 数字孪生的地面（柱群立于其上，楼宇大屏的空间参照）
  GROUND_CELL: 40,               // 地台格距（世界系 px — 网格距离场的周期）
  GROUND_GLOW: 0.5,              // 地台辉光强度
  GROUND_MARGIN: 1.12,           // 地台外扩比 — 柱群包围盒向外的地台余量
} as const

/** 挤出半厚 — THICK_BAR/2 的单点派生（interact/camera3/render-3d 共用，禁散布重算） */
const HALF_EXTRUDE_Z = C3D.THICK_BAR / 2

// —— WebGPU 资源（GPUBufferUsage / 顶点数等位值具名）——
const GPU = {
  USAGE_STORAGE_DST: 0x80 | 8,   // STORAGE | COPY_DST
  USAGE_UNIFORM_DST: 0x40 | 8,   // UNIFORM | COPY_DST
  USAGE_RENDER_ATTACH: 0x10,     // RENDER_ATTACHMENT
  MSAA_SAMPLES: 4,               // MSAA 采样数
  BOX_VERTS: 36,                 // 盒体顶点数（12 三角面 ×3）
  GROUND_VERTS: 6,               // 地台顶点数（2 三角面 ×3）
  /** 扇段顶点数 = 顶盖 fan + 底盖 fan + 弧壁 + 侧壁（与 vs_sector 的 vi 分解一一对应） */
  SECTOR_VERTS_PER_SEG: 12,      // 每细分段顶点数（fan×2 + 弧壁 + 侧壁）
  SCENE_UNIFORM_FLOATS: 32,      // 场景 uniform 浮点数（128B / 4）
} as const

/** 扇段顶点总数 — 每段 12 顶点 × 段数 + 端帽补点（与 vs_sector 的 vi 分解一一对应；段数同源 C3D） */
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
