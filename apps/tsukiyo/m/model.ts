/**
 * TsuModel — SoA 唯一数据源（13 平行 TypedArray，零冗余零副本，定长预分配零 GC）。
 * slot = SoA 下标（hover/click/dirty 统一标识）；src[] = slot → elements 下标。
 * 脏协议：markDirty 幂等置位，drainDirty 唯一消费（layering，复用 buffer 零分配）。
 * 写入出口（收口本类，外部禁直写）：stepAnim/setClickSlots→anim；setHoverSlots→hoverSlots；clearClick→clickSlots
 */
import type { Element, DimConf, Bounds } from '../yomi'
import { Prim } from '../yomi'
import { GEO_SLOTS_EACH_ELEM } from '../helper/const'
import { DEFAULT_CAP, AABB_HIT_PAD, ANIM_STEP } from '../helper/const'

type TypedArrayCtor = new (n: number) => TypedArray
type TypedArray = Uint32Array | Uint8Array | Float32Array

export class TsuModel {
  // —— 原始输入 & 标准化元素（input 暂存供 point 读）——
  raw: any[] = []
  elements: Element[] = []
  // —— 维度字符串 → 索引映射（派生自 elements）——
  dimXMap: Map<string, number> = new Map()
  dimYMap: Map<string, number> = new Map()

  // —— SoA 主体 ——
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
  anim:   Float32Array  // 生长比例 0~1（1=完全生长）— stepAnim/setClickSlots 唯一写入
  dirty:  Uint8Array    // 脏位图（markDirty 唯一写入点 — 禁绕过）
  aux:    Float32Array  // 几何参数（GEO_SLOTS_EACH_ELEM 槽位/元素：aux0=r, aux1=startAng, aux2=endAng）

  // —— 脏槽收集 buffer（drainDirty 复用，非真相结构）——
  private drainBuf: number[] = []

  dataDirty = false     // 数据变化标志（触发 input→point→coord→paths 重执行）
  hoverSlots = new Set<number>()  // hover 槽位集 — setHoverSlots/clearHover 唯一写入
  clickSlots = new Set<number>()  // click 锁定集 — setClickSlots/clearClick 唯一写入

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
    this.anim.fill(1)   // 初始 anim=1 = 无动画
  }

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

  /** 消费脏槽 — 扫描 0..count 收集 + 清零（layering 唯一消费者；复用 buffer 零分配） */
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

  // —— anim 插值 & hover/click 锁定 — 统一写入出口 ——

  /** anim 推进 — anim<1 者推进 ANIM_STEP（钳 1）+ 标脏续播；layering ⑤ 传重绘大名单（视线外延迟生长） */
  stepAnim($slots: number[]): void {
    for (const i of $slots) {
      const t = this.anim[i]
      if (t < 1) {
        this.anim[i] = Math.min(1, t + ANIM_STEP)
        this.markDirty(i)
      }
    }
  }

  /** hover 整集替换 — 对称差标脏 + 替换；返回新集（tooltip 判空用） */
  setHoverSlots($slots: number[]): Set<number> {
    const prev = this.hoverSlots
    const next = new Set<number>()
    for (const slot of $slots) {
      if (slot >= 0 && slot < this.count) next.add(slot)
    }
    if (prev.size !== next.size || ![...prev].every($s => next.has($s))) {
      for (const slot of prev) if (!next.has(slot)) this.markDirty(slot)
      for (const slot of next) if (!prev.has(slot)) this.markDirty(slot)
    }
    this.hoverSlots = next
    return next
  }

  /** 清 hover — 全集标脏 + 清空 */
  clearHover(): void {
    for (const slot of this.hoverSlots) this.markDirty(slot)
    this.hoverSlots.clear()
  }

  /** click 锁定整集替换 — 旧锁定 snap anim=1 + 新锁定 anim=0 重生长（幂等） */
  setClickSlots($slots: number[]): void {
    // 旧锁定不在新集 → snap anim=1 立即结束
    for (const slot of this.clickSlots) {
      if (!$slots.includes(slot)) {
        this.anim[slot] = 1
        this.markDirty(slot)
      }
    }
    // 新锁定 anim=0 重置生长
    const newSet = new Set($slots)
    for (const slot of $slots) {
      this.anim[slot] = 0
      this.markDirty(slot)
    }
    this.clickSlots = newSet
  }

  /** 清 click — 仅清集合不 snap anim（生长由 stepAnim 自然完成） */
  clearClick(): void {
    this.clickSlots.clear()
  }

  /** 暂存标准化元素（SoA 写入权唯一归 pointTask，此处零 SoA 写入）；维度映射自 std 产出派生（零外部 dim 传参） */
  loadElements($elements: Element[]) {
    this.elements = $elements

    // 维度映射 — 自描述取值：e.dimX 是字段名，维度值在 e[e.dimX]（基元快路径→行号；melt→字段值）
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

    // 确保容量（下限；point 展开多原语由 pointTask 就地扩容）
    if ($elements.length > this.capacity) {
      this.grow(Math.max($elements.length, this.capacity * 2))
    }

    this.dataDirty = true
  }

  // vToM — 槽位反查元素（hover→tooltip；slot 经 src[] 映射）
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

  /** 单元素 AABB 写入 $out（min/max 归一化 — Line 的 w/h 可为负）；Arc 用 aux[0] 半径做包围盒 */
  aabbInto($i: number, $out: Bounds): Bounds {
    const x = this.x[$i], y = this.y[$i]
    const t = this.type[$i]
    // Arc/Circle — 半径正方形包围盒
    if (t === Prim.Arc || t === Prim.Circle) {
      const r = this.aux[$i * GEO_SLOTS_EACH_ELEM]
      $out[0][0] = x - r; $out[0][1] = y - r
      $out[1][0] = x + r; $out[1][1] = y + r
      return $out
    }
    const w = this.w[$i], h = this.h[$i]
    // Line — Δx/Δy 包围盒 + AABB_HIT_PAD（零厚度线段保证可命中）
    if (t === Prim.Line) {
      const pad = AABB_HIT_PAD
      $out[0][0] = Math.min(x, x + w) - pad; $out[0][1] = Math.min(y, y + h) - pad
      $out[1][0] = Math.max(x, x + w) + pad; $out[1][1] = Math.max(y, y + h) + pad
      return $out
    }
    // Triangle — 三顶点包围盒 + pad（覆盖描边 + hover 缩放残影）
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

  /** 内容总边界 — 聚合 AABB 单一实现（camera3 取景/render-3d 铺地台派生自消双实现）；翻 Y 世界盒归调用方 */
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
