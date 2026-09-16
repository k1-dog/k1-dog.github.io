/**
 * TsuModel — SoA (Structure of Arrays) 唯一数据源
 *
 * 13 个平行 TypedArray（src/dimX/dimY/value/x/y/w/h/type/fill/anim/dirty/aux）
 * 每个都不可从其他派生 > 零冗余
 * 所有模块（coord/spatial/dirty/render）只读写这些数组 > 不存数据副本
 *
 * 命名正名（全系统统一，禁混用）：
 *   slot（槽位）= SoA 数组下标 — 空间索引/hover/click/dirty 全部以 slot 为准
 *   src[]（源元素映射）= slot → elements 下标 — vToM/mToV 反查用
 *
 * CPU 按列遍历时缓存命中率高，SIMD 可一次处理 8 个 float
 * TypedArray 定长预分配，正常运行零 GC
 *
 * 脏协议（位图单真相 — 零同步需求，零同步 bug）：
 *   dirty[slot]=1 是幂等置位 — markDirty 是礼貌写入口，任何模块直写 dirty[i]=1 同样合法
 *     （守卫只查物理边界，不查逻辑 count — pointTask 在 count 定稿前的循环内标脏天然合法）
 *   drainDirty() — layering 唯一消费者：扫描 0..count 位图收集脏槽（复用 buffer 零分配）
 *     + 扫描后位图清零。对任意写入方式闭合（markDirty / 直写 / fill）
 *   单一真相结构 + 幂等写 + 单点消费 — 无第二结构需要同步，永远无漂移
 */
import type { Element, DimConf, Bounds } from '../yomi'
import { Prim } from '../yomi'
import { GEO_SLOTS_EACH_ELEM } from '../helper/const'
import { DEFAULT_CAP, AABB_HIT_PAD } from '../helper/const'

type TypedArrayCtor = new (n: number) => TypedArray
type TypedArray = Uint32Array | Uint8Array | Float32Array

export class TsuModel {
  // —— 原始输入 & 标准化元素（input 阶段短暂存在，供 point 读取）——
  raw: any[] = []
  elements: Element[] = []

  // —— 维度字符串 → 索引映射（派生自 elements，不存数据副本）——
  dimXMap: Map<string, number> = new Map()
  dimYMap: Map<string, number> = new Map()

  // —— SoA 主体：13 个平行数组，零冗余 ——
  count = 0
  capacity = DEFAULT_CAP

  src:    Uint32Array   // slot → elements 下标（vToM/mToV 反查）
  dimX:   Uint32Array   // X 维度索引（coord 布局 + 反查）
  dimY:   Uint8Array    // Y 维度索引
  value:  Float32Array  // 原始数值（coord 映射 Y 轴）
  x:      Float32Array  // 当前位置 x（coord 写，render 读）
  y:      Float32Array  // 当前位置 y
  w:      Float32Array  // 几何宽（point 写，render 读）
  h:      Float32Array  // 几何高
  type:   Uint8Array    // 原语枚举 Prim（point 写，render 分桶读）
  fill:   Uint32Array   // packed RGBA（point 唯一写入；hover 高亮为 render 派生态，不改写）
  anim:   Float32Array  // 生长比例 0~1（1=完全生长）— layering 唯一写入
  dirty:  Uint8Array    // 脏位图（markDirty 唯一写入点 — 禁绕过）
  aux:    Float32Array  // 几何参数（GEO_SLOTS_EACH_ELEM 槽位/元素：aux0=r, aux1=startAng, aux2=endAng）

  // —— 脏槽收集 buffer（drainDirty 扫描复用，零每帧分配；非真相结构）——
  private drainBuf: number[] = []

  // —— 运行时状态标志 ——
  dataDirty = false     // 数据是否变化（触发 input→point→coord→paths 重新执行）
  hoverSlots = new Set<number>()  // 当前 hover 槽位集合 — render 派生高亮（只读）
  clickSlots = new Set<number>()  // 当前 click 锁定槽位集合 — interact 重置 anim=0 触发生长动画

  constructor(cap = DEFAULT_CAP) {
    this.capacity = cap
    this.src     = new Uint32Array(cap)
    this.dimX    = new Uint32Array(cap)
    this.dimY    = new Uint8Array(cap)
    this.value   = new Float32Array(cap)
    this.x       = new Float32Array(cap)
    this.y       = new Float32Array(cap)
    this.w       = new Float32Array(cap)
    this.h       = new Float32Array(cap)
    this.type    = new Uint8Array(cap)
    this.fill    = new Uint32Array(cap)
    this.anim    = new Float32Array(cap)
    this.dirty   = new Uint8Array(cap)
    this.aux     = new Float32Array(cap * GEO_SLOTS_EACH_ELEM)
    // 初始 anim=1 表示无动画
    this.anim.fill(1)
  }

  // 扩容 — 仅在元素数超过 capacity 时调用
  grow($newCap: number) {
    const growArr = <T extends TypedArray>($arr: T, $ctor: TypedArrayCtor): T => {
      const next = new $ctor($newCap) as T
      next.set($arr)
      return next
    }
    this.src    = growArr(this.src, Uint32Array)
    this.dimX   = growArr(this.dimX, Uint32Array)
    this.dimY   = growArr(this.dimY, Uint8Array)
    this.value  = growArr(this.value, Float32Array)
    this.x      = growArr(this.x, Float32Array)
    this.y      = growArr(this.y, Float32Array)
    this.w      = growArr(this.w, Float32Array)
    this.h      = growArr(this.h, Float32Array)
    this.type   = growArr(this.type, Uint8Array)
    this.fill   = growArr(this.fill, Uint32Array)
    this.anim   = growArr(this.anim, Float32Array)
    this.dirty  = growArr(this.dirty, Uint8Array)
    // aux 扩容
    const oldAux = this.aux
    this.aux = new Float32Array($newCap * GEO_SLOTS_EACH_ELEM)
    oldAux && this.aux.set(oldAux.subarray(0, this.capacity * GEO_SLOTS_EACH_ELEM))
    this.capacity = $newCap
    this.anim.fill(1, this.count)
  }

  // —— 脏协议（位图单真相 — 幂等置位 + 单点扫描消费）——

  /** 标脏单槽位 — 幂等置位（守卫只查物理边界，不查逻辑 count） */
  markDirty($slot: number): void {
    if ($slot < 0 || $slot >= this.dirty.length) return
    this.dirty[$slot] = 1
  }

  /** 全量标脏 — 位图批量置位（0..count） */
  markAllDirty(): void {
    this.dirty.fill(1, 0, this.count)
  }

  /**
   * 消费脏槽 — 扫描 0..count 位图收集 + 扫描后清零（layering 唯一消费者）。
   * 扫描兜底对任意写入方式闭合：markDirty / dirty[i]=1 直写 / fill 全部兼容。
   * buffer 复用零每帧分配；位图顺序扫描 cache 友好。
   */
  drainDirty(): number[] {
    const buf = this.drainBuf
    buf.length = 0
    const n = this.count
    for (let _i = 0; _i < n; _i++) {
      if (this.dirty[_i]) {
        buf.push(_i)
        this.dirty[_i] = 0
      }
    }
    return buf
  }

  /** 暂存标准化元素（input/scale 阶段调用；SoA 数组写入权唯一归 pointTask — 此处零 SoA 写入）
   *  维度映射从 std 产出自身派生（e.dimX 值去重 / e.dimY 去重）— scale 测绘产物是唯一事实源，零外部 dim 传参 */
  loadElements($elements: Element[]) {
    this.elements = $elements

    // 构建维度映射 — 自描述取值：e.dimX 是字段名，维度值在 e[e.dimX]
    // （基元快路径 {dimX:'index', index:0} → 行号；melt {dimX:'user', user:'kurumi'} → 字段值）
    // dimY 字段直接存系列名，直接用。std 产出是唯一事实源，零外部 dim 传参
    this.dimXMap.clear()
    this.dimYMap.clear()
    let _dimXi = 0
    let _dimYi = 0
    for (const e of $elements) {
      const dx = String(e[e.dimX])
      if (!this.dimXMap.has(dx)) this.dimXMap.set(dx, _dimXi++)
      const dy = String(e.dimY)
      if (!this.dimYMap.has(dy)) this.dimYMap.set(dy, _dimYi++)
    }

    // 确保容量（按源元素数下限；point 展开多原语时由 pointTask 就地扩容补足）
    if ($elements.length > this.capacity) {
      this.grow(Math.max($elements.length, this.capacity * 2))
    }

    this.dataDirty = true
  }

  // vToM — 从视觉槽位反查模型元素（hover→tooltip）
  // $slot 是 SoA 槽位索引，经 src[] 映射到原始元素
  vToM($slot: number): Element | null {
    if ($slot < 0 || $slot >= this.count) return null
    return this.elements[this.src[$slot]] ?? null
  }

  // mToV — 从模型查询条件查视觉槽位数组（数据更新→定位）
  mToV($query: Partial<Element>): number[] {
    const keys = Object.keys($query)
    const result: number[] = []
    for (let _i = 0; _i < this.count; _i++) {
      const el = this.elements[this.src[_i]]
      if (!el) continue
      if (keys.every($k => el[$k] === ($query as any)[$k])) {
        result.push(_i)
      }
    }
    return result
  }

  // —— AABB（零分配版 — 调用方持有 out 缓冲复用，热路径零 GC）——

  /**
   * 算单个元素的 AABB，写入 $out（[minX, minY, maxX, maxY]）并返回。
   * min/max 归一化 — Line 的 w/h 可能为负（上升线段 Δy<0），需保证 min ≤ max
   * Arc 用 aux[0] 半径做包围盒（w/h 对 Arc 无意义）
   */
  aabbInto($i: number, $out: Bounds): Bounds {
    const x = this.x[$i], y = this.y[$i]
    const t = this.type[$i]
    // Arc/Circle — 用半径做正方形包围盒
    if (t === Prim.Arc || t === Prim.Circle) {
      const r = this.aux[$i * GEO_SLOTS_EACH_ELEM]
      $out[0][0] = x - r; $out[0][1] = y - r
      $out[1][0] = x + r; $out[1][1] = y + r
      return $out
    }
    const w = this.w[$i], h = this.h[$i]
    // Line 用 Δx/Δy 算包围盒，水平/垂直线段 Δy/Δx=0 导致零厚度无法命中
    // 加 AABB_HIT_PAD margin 保证可点击
    if (t === Prim.Line) {
      const pad = AABB_HIT_PAD
      $out[0][0] = Math.min(x, x + w) - pad; $out[0][1] = Math.min(y, y + h) - pad
      $out[1][0] = Math.max(x, x + w) + pad; $out[1][1] = Math.max(y, y + h) + pad
      return $out
    }
    // Triangle 三顶点包围盒 — V_d(x,y) / V_{d+1}(x+w,y+h) / C(x+aux0,y+aux1)
    // 加 AABB_HIT_PAD margin 覆盖描边 + hover 径向缩放残影
    if (t === Prim.Triangle) {
      const a = $i * GEO_SLOTS_EACH_ELEM
      const cx = x + this.aux[a]
      const cy = y + this.aux[a + 1]
      const pad = AABB_HIT_PAD
      $out[0][0] = Math.min(x, x + w, cx) - pad; $out[0][1] = Math.min(y, y + h, cy) - pad
      $out[1][0] = Math.max(x, x + w, cx) + pad; $out[1][1] = Math.max(y, y + h, cy) + pad
      return $out
    }

    $out[0][0] = Math.min(x, x + w); $out[0][1] = Math.min(y, y + h)
    $out[1][0] = Math.max(x, x + w); $out[1][1] = Math.max(y, y + h)
    return $out
  }

  /**
   * 内容总边界（图表系）— 聚合全部元素 AABB 的单一实现。
   * camera3 取景与 render-3d 铺地台都派生自此（消双实现）；
   * 3D 特有的"翻 Y 成世界盒"转换归调用方，model 不感知 3D 概念。
   */
  contentBounds(): Bounds | null {
    const out: Bounds = [[0, 0], [0, 0]]
    let _x0 = Infinity, _y0 = Infinity, _x1 = -Infinity, _y1 = -Infinity
    for (let _i = 0; _i < this.count; _i++) {
      const b = this.aabbInto(_i, out)
      if (b[0][0] < _x0) _x0 = b[0][0]
      if (b[0][1] < _y0) _y0 = b[0][1]
      if (b[1][0] > _x1) _x1 = b[1][0]
      if (b[1][1] > _y1) _y1 = b[1][1]
    }
    if (_x0 > _x1) return null   // 空模型
    return [[_x0, _y0], [_x1, _y1]]
  }
}
