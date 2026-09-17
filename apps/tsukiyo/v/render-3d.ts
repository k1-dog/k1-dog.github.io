/**
 * render-3d — WebGPU 3D 后端。公理：世界系 = SoA 屏幕系 + Z 轴（worldY=-screenY 翻 Y，worldZ=±THICK/2）。
 * 相机归 camera3（矩阵透传 flush，渲染与命中同源）。增量语义：全量 pack ⟺ 大名单=count
 * （非本原语写零退化+重算 drawCount）；增量仅覆写 大名单∩本原语；大名单空 → 帧持久。
 * 玻璃透明：alpha 混合+无深度（免 z-fighting 与排序）；Lambert 区分面朝向。
 * 加材料三步：① xxx.wgsl（Inst 只用 f32 标量 — vec3 触发 16 字节对齐）+几何表+@vertex 入口；
 * ② xxxToWorld 翻 Y 挤出 Z 镜像 2D 锚点；③ coordXYToWorld 加 case。WGSL 独立文件 ?raw 加载。
 */

import type { Renderer, Bounds, Prim, Vec3 } from '../yomi'
import { Prim as P } from '../yomi'
import type { TsuModel } from '../m/model'
import {
  C3D, GEO_SLOTS_EACH_ELEM, HOVER_SCALE, HALF_EXTRUDE_Z, SECTOR_VERTS,
  STROKE_LOCKED, STROKE_NORMAL, GPU,
} from '../helper/const'
import WGSL_COMMON from './wgsl/common.wgsl?raw'
import WGSL_BOX from './wgsl/box.wgsl?raw'
import WGSL_SECTOR from './wgsl/sector.wgsl?raw'
import WGSL_GROUND from './wgsl/ground.wgsl?raw'

/* WebGPU 类型守卫 — 无 @webgpu/types 时以 any 运行 */
type GPU = any

/** 实例浮点数 = Inst 字段数（10×f32=40B），TS/WGSL 同源 */
const INST_FLOATS = 10

// —— 专家 — SoA 2D 终态 → 世界系实例（镜像 2D drawBatch 各 case 锚点语义；coordXYToWorld 统一包装）——

/** packed RGBA → 实例颜色（0~1 归一 pack 时完成）；alpha × ALPHA_MUL 玻璃倍率 */
function packColor($out: Float32Array, $b: number, $fill: number): void {
  $out[$b + 6] = (($fill >>> 16) & 0xff) / 255
  $out[$b + 7] = (($fill >>> 8) & 0xff) / 255
  $out[$b + 8] = $fill & 0xff
  $out[$b + 9] = (($fill >>> 24) & 0xff) / 255 * C3D.ALPHA_MUL
}

/** Rect → 盒体。anim 底部锚点生长 + hover 底部中心缩放 */
function rectToWorld($m: TsuModel, $i: number, $out: Float32Array, $hover: boolean): void {
  const t = $m.anim[$i]
  const x = $m.x[$i], y = $m.y[$i], w = $m.w[$i], h = $m.h[$i]
  let _dw = w, _dh = h * t
  if ($hover) { _dw = w * HOVER_SCALE; _dh = h * t * HOVER_SCALE }
  const $b = $i * INST_FLOATS
  $out[$b] = x + (w - _dw) / 2            // 中心 x 不变
  $out[$b + 1] = -(y + h - _dh / 2)        // 底部锚点（翻 Y）
  $out[$b + 2] = 0
  $out[$b + 3] = _dw / 2
  $out[$b + 4] = _dh / 2
  $out[$b + 5] = HALF_EXTRUDE_Z
  packColor($out, $b, $m.fill[$i])
}

/** Line → 旋转细盒。anim 起点锚点延伸（镜像 2D Line case）；零长度 → 全零退化实例不可见 */
function lineToWorld($m: TsuModel, $i: number, $out: Float32Array, $hover: boolean): void {
  const t = $m.anim[$i]
  const x = $m.x[$i], y = $m.y[$i]
  const dx = $m.w[$i] * t, dy = $m.h[$i] * t
  const $b = $i * INST_FLOATS
  if (dx === 0 && dy === 0) { $out.fill(0, $b, $b + INST_FLOATS); return }
  const len = Math.hypot(dx, dy)
  // hover 加粗 — 与 2D STROKE_LOCKED/STROKE_NORMAL 同比（派生比值）
  const hy = ($hover ? STROKE_LOCKED / STROKE_NORMAL : 1) * C3D.THICK_LINE / 2
  $out[$b] = x + dx / 2
  $out[$b + 1] = -(y + dy / 2)
  $out[$b + 2] = Math.atan2(-dy, dx)     // 世界系角度（翻 Y）
  $out[$b + 3] = len / 2
  $out[$b + 4] = hy
  $out[$b + 5] = HALF_EXTRUDE_Z         // 与柱体同 Z 厚度
  packColor($out, $b, $m.fill[$i])
}

/** Arc → 圆柱扇段。anim 半径生长 + 角度扫描 + hover 半径缩放；worldAng = -screenAng（起始取 -startAng，扫描取负） */
function sectorToWorld($m: TsuModel, $i: number, $out: Float32Array, $hover: boolean): void {
  const t = $m.anim[$i]
  const a = $i * GEO_SLOTS_EACH_ELEM
  let _r = $m.aux[a] * t
  if ($hover) _r *= HOVER_SCALE
  const $b = $i * INST_FLOATS
  $out[$b] = $m.x[$i]                    // 圆心（世界系 Y 翻转）
  $out[$b + 1] = -$m.y[$i]
  $out[$b + 2] = _r
  $out[$b + 3] = -$m.aux[a + 1]          // start³ᴰ = -startAng（固定锚）
  $out[$b + 4] = -($m.aux[a + 2] - $m.aux[a + 1]) * t   // sweep³ᴰ = -sweep×t（扫描张开）
  $out[$b + 5] = HALF_EXTRUDE_Z
  packColor($out, $b, $m.fill[$i])
}

/** 统一包装器 — type[i] 分派专家（分派与过滤双读同一 type[i]，值不可能漂移） */
function coordXYToWorld($m: TsuModel, $i: number, $out: Float32Array, $hover: boolean): void {
  switch ($m.type[$i]) {
    case P.Rect: return rectToWorld($m, $i, $out, $hover)
    case P.Line: return lineToWorld($m, $i, $out, $hover)
    case P.Arc: return sectorToWorld($m, $i, $out, $hover)
  }
}


// —— Material — 原子材料 = 静态注册字段 + 私有 GPU 资源 ——

// 1 原语 = 1 注册项 = 1 storage = 1 draw call；'ground' 场景件（uniform 四至驱动，无 storage）
class Material {
  constructor(
    readonly prim: Prim | 'ground',
    readonly entry: string,
    readonly verts: number,
  ) {}

  // GPU 资源（托管）
  gpu: GPU = null
  staging: Float32Array = new Float32Array(0)
  bindGroup: GPU = null
  pipeline: GPU = null
  capacity = 0
  drawCount = 0       // 实例上界（全量 pack 重算）

  // 容量自增 — 返回是否增容（据此重挂 bindGroup）
  ensure($device: GPU, $count: number): boolean {
    if ($count <= this.capacity) return false
    this.capacity = Math.max($count, this.capacity * 2)
    this.staging = new Float32Array(this.capacity * INST_FLOATS)
    this.gpu?.destroy()
    this.gpu = $device.createBuffer({
      size: this.capacity * INST_FLOATS * 4,
      usage: GPU.USAGE_STORAGE_DST,   // STORAGE | COPY_DST
    })
    return true
  }
}

// —— WebGPU3D — Renderer 契约的 3D 实现（纯执行者）——

export class WebGPU3D implements Renderer {
  private canvas: HTMLCanvasElement | null = null
  private device: GPU = null
  private context: GPU = null
  private format = 'bgra8unorm'
  private uniform: GPU = null
  private bgl: GPU = null          // SoA 材料 bgl（uniform + storage）
  private groundBgl: GPU = null    // 地台 bgl（uniform-only）
  // 地台四至 — 世界系（全量帧聚合；空模型保留上一帧）
  private ground: [number, number, number, number] | null = null
  private materials: Material[] = []
  private uniformData = new Float32Array(GPU.SCENE_UNIFORM_FLOATS)   // 128B 复用缓冲
  ready = false

  // device.lost 唯一写者（唯一 tick 外异步点）
  private lost = false

  // MSAA 尺寸分支缓存
  private texW = 0
  private texH = 0
  private msaaTex: GPU = null
  private msaaView: GPU = null

  // GPU 初始化 — 任一步失败返回 false（工厂回退 Canvas2D）
  async init($canvas: HTMLCanvasElement): Promise<boolean> {
    this.canvas = $canvas
    try {
      const gpu = (navigator as any).gpu
      const adapter = gpu && await gpu.requestAdapter()
      if (!adapter) return false
      this.device = await adapter.requestDevice()
      this.device.lost.then(() => { this.lost = true; this.ready = false })

      this.context = $canvas.getContext('webgpu')
      this.format = gpu.getPreferredCanvasFormat()
      this.context.configure({ device: this.device, format: this.format, alphaMode: 'opaque' })

      // 验证错误 error scope（验证错误不抛异常只产生 invalid 对象）
      this.device.pushErrorScope('validation')

      // 场景 uniform — 共享 binding 0；128B = mat4x4+lightDir+viewRim+neon+ground（各 16/64B）
      this.uniform = this.device.createBuffer({ size: 128, usage: GPU.USAGE_UNIFORM_DST })

      const shader = this.device.createShaderModule({
        code: [WGSL_COMMON, WGSL_BOX, WGSL_SECTOR, WGSL_GROUND].join('\n'),
      })

      // WGSL 编译诊断 — 主动查 error 避免黑屏
      const info = await (shader as any).getCompilationInfo()
      const errs = info.messages.filter(($m: any) => $m.type === 'error')
      if (errs.length > 0) {
        await this.device.popErrorScope()   // 平衡 push
        for (const m of errs) console.warn(`[tsukiyo] WGSL ${m.lineNum}:${m.linePos} ${m.message}`)
        return false
      }
      // bgl: 0=相机 uniform, 1=实例 storage；binding 0 需 VERTEX|FRAGMENT(=3)（fs_lambert 也读 lightDir）
      this.bgl = this.device.createBindGroupLayout({
        entries: [
          { binding: 0, visibility: 3, buffer: { type: 'uniform' } },
          { binding: 1, visibility: 1, buffer: { type: 'read-only-storage' } },
        ],
      })
      const layout = this.device.createPipelineLayout({ bindGroupLayouts: [this.bgl] })
      this.groundBgl = this.device.createBindGroupLayout({   // 地台 bgl（仅 binding 0）
        entries: [{ binding: 0, visibility: 3, buffer: { type: 'uniform' } }],
      })
      const groundLayout = this.device.createPipelineLayout({ bindGroupLayouts: [this.groundBgl] })

      // 材料注册表 — Rect/Line 共享 vs_box（独立 buffer/bindGroup）
      this.materials = [
        new Material(P.Rect, 'vs_box', GPU.BOX_VERTS),
        new Material(P.Line, 'vs_box', GPU.BOX_VERTS),
        new Material(P.Arc, 'vs_sector', SECTOR_VERTS),
        new Material('ground', 'vs_ground', GPU.GROUND_VERTS),
      ]

      for (const mat of this.materials) {
        const isGround = mat.prim === 'ground'
        // override 分 stage（GROUND_Z 在 vs，CELL/GLOW 在 fs）
        const vConstants = isGround ? { GROUND_Z: -HALF_EXTRUDE_Z } : undefined
        const fConstants = isGround
          ? { GROUND_CELL: C3D.GROUND_CELL, GROUND_GLOW: C3D.GROUND_GLOW }
          : undefined

        mat.pipeline = this.device.createRenderPipeline({
          layout: isGround ? groundLayout : layout,
          vertex: {
            module: shader,
            entryPoint: mat.entry,
            // 扇段段数 override 注入
            constants: mat.prim === P.Arc ? { SECTOR_SEGS: C3D.SECTOR_SEGS } : vConstants,
          },
          // additive 混合；无 depthStencil（叠加代替遮挡 → 免排序）
          fragment: {
            module: shader,
            entryPoint: isGround ? 'fs_ground' : 'fs_glass',
            targets: [{
              format: this.format,
              blend: {
                color: { srcFactor: 'src-alpha', dstFactor: 'one', operation: 'add' },
                alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
              },
            }],
          },
          primitive: { topology: 'triangle-list', cullMode: 'none' },
          multisample: { count: GPU.MSAA_SAMPLES },
        })

        // 地台 bindGroup（一次性挂接）
        if (isGround) {
          mat.bindGroup = this.device.createBindGroup({
            layout: this.groundBgl,
            entries: [{ binding: 0, resource: { buffer: this.uniform } }],
          })
        }
      }

      // pipeline/bgl 验证失败在此捕获
      const verr = await this.device.popErrorScope()
      if (verr) {
        console.warn('[tsukiyo] WebGPU 验证错误，回退 Canvas2D:', verr.message)
        return false
      }

      this.ready = true
      return true
    } catch ($e) {
      console.warn('[tsukiyo] WebGPU 3D 初始化失败，回退 Canvas2D:', $e)
      return false
    }
  }

  // 尺寸变化 → 重建 MSAA 纹理
  private rebuildTargets($w: number, $h: number): void {
    this.msaaTex?.destroy?.()
    this.msaaTex = this.device.createTexture({
      size: [$w, $h], format: this.format, sampleCount: GPU.MSAA_SAMPLES,
      usage: GPU.USAGE_RENDER_ATTACH,
    })
    this.msaaView = this.msaaTex.createView()
    this.texW = $w
    this.texH = $h
  }

  // clipMatrix/sight — camera3 同一次取景产出（渲染与命中同源）
  flush($model: TsuModel, $regionDrawing: Bounds | null, $regionBigDrawing?: number[],
        $clipMatrix?: Float32Array | null, $sight?: Vec3 | null): void {
    if (!this.ready || this.lost || !this.device || !this.context || !this.canvas) return
    const big = $regionBigDrawing ?? []
    if (big.length === 0) return                       // 帧持久
    if (!$clipMatrix || !$sight) return                // 相机未就绪 → 无可绘制

    const w = this.canvas.width
    const h = this.canvas.height
    if (w === 0 || h === 0) return
    if (w !== this.texW || h !== this.texH) this.rebuildTargets(w, h)

    const full = big.length === $model.count           // 全量 ⟺ 大名单 = count

    for (const mat of this.materials) {
      if (mat.prim === 'ground') {                     // 场景件（全量帧聚合四至）
        if (full) this.layGround($model)
        continue
      }
      if (mat.ensure(this.device, $model.count)) this.rebind(mat)
      const range = full ? this.packAll(mat, $model) : this.packSome(mat, $model, big)
      this.upload(mat, range)
    }

    // 场景 uniform 一次 128B 写入（与 common.wgsl 字节对齐）
    const u = this.uniformData
    u.set($clipMatrix)
    u[16] = C3D.LIGHT[0]; u[17] = C3D.LIGHT[1]; u[18] = C3D.LIGHT[2]; u[19] = C3D.AMBIENT
    u[20] = $sight[0];    u[21] = $sight[1];    u[22] = $sight[2];    u[23] = C3D.RIM_I
    u[24] = C3D.NEON_CYAN[0]; u[25] = C3D.NEON_CYAN[1]; u[26] = C3D.NEON_CYAN[2]; u[27] = C3D.NEON_TINT
    const g = this.ground ?? [0, 0, 0, 0]
    u[28] = g[0]; u[29] = g[1]; u[30] = g[2]; u[31] = g[3]
    this.device.queue.writeBuffer(this.uniform, 0, u)

    // 单 render pass — 逐材料绘制
    const encoder = this.device.createCommandEncoder()
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: this.msaaView,
        resolveTarget: this.context.getCurrentTexture().createView(),
        clearValue: { r: C3D.CLEAR[0], g: C3D.CLEAR[1], b: C3D.CLEAR[2], a: C3D.CLEAR[3] },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    })
    for (const mat of this.materials) {
      if (mat.prim === 'ground') {
        if (!this.ground) continue
        pass.setPipeline(mat.pipeline)
        pass.setBindGroup(0, mat.bindGroup)
        pass.draw(mat.verts)
        continue
      }
      if (mat.drawCount === 0) continue
      pass.setPipeline(mat.pipeline)
      pass.setBindGroup(0, mat.bindGroup)
      pass.draw(mat.verts, mat.drawCount)
    }
    pass.end()
    this.device.queue.submit([encoder.finish()])
  }

  // 铺地 — contentBounds → 翻 Y × GROUND_MARGIN 外扩（空模型保留上一帧）
  private layGround($m: TsuModel): void {
    const box = $m.contentBounds()
    if (!box) return
    // 翻 Y + 外扩
    const cx = (box[0][0] + box[1][0]) / 2, cy = (box[0][1] + box[1][1]) / 2
    const hx = (box[1][0] - box[0][0]) / 2 * C3D.GROUND_MARGIN
    const hy = (box[1][1] - box[0][1]) / 2 * C3D.GROUND_MARGIN
    this.ground = [cx - hx, -(cy + hy), cx + hx, -(cy - hy)]
  }

  // 全量 pack — 非本原语写零退化 + drawCount 重算
  private packAll($mat: Material, $m: TsuModel): [number, number] | null {
    let _top = 0
    for (let _i = 0; _i < $m.count; _i++) {
      if ($m.type[_i] === $mat.prim) {
        coordXYToWorld($m, _i, $mat.staging, $m.hoverSlots.has(_i))
        _top = _i + 1
      } else {
        $mat.staging.fill(0, _i * INST_FLOATS, (_i + 1) * INST_FLOATS)
      }
    }
    $mat.drawCount = _top
    return _top > 0 ? [0, _top - 1] : null
  }

  // 增量 pack — 仅 大名单∩本原语；未动槽位保留上帧
  private packSome($mat: Material, $m: TsuModel, $big: number[]): [number, number] | null {
    let _lo = Infinity, _hi = -Infinity
    for (const i of $big) {
      if ($m.type[i] !== $mat.prim) continue
      coordXYToWorld($m, i, $mat.staging, $m.hoverSlots.has(i))
      if (i < _lo) _lo = i
      if (i > _hi) _hi = i
    }
    return _lo <= _hi ? [_lo, _hi] : null
  }

  // bindGroup 挂接（uniform + storage）
  private rebind($mat: Material): void {
    $mat.bindGroup = this.device.createBindGroup({
      layout: this.bgl,
      entries: [
        { binding: 0, resource: { buffer: this.uniform } },
        { binding: 1, resource: { buffer: $mat.gpu } },
      ],
    })
  }

  // 上传 — 最小连续区间（下帧覆写安全）
  private upload($mat: Material, $range: [number, number] | null): void {
    if (!$range) return
    const off = $range[0] * INST_FLOATS
    const len = ($range[1] - $range[0] + 1) * INST_FLOATS
    this.device.queue.writeBuffer($mat.gpu, off * 4, $mat.staging, off, len)
  }

  // 释放 GPU 资源
  destroy(): void {
    for (const mat of this.materials) { mat.gpu?.destroy?.() }
    this.msaaTex?.destroy?.()
    this.uniform?.destroy?.()
    this.ready = false
  }
}
