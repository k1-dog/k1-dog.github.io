/**
 * v/render-3d — draw 阶段、WebGPU 后端；世界 = SoA 屏幕空间沿 Z 挤出
 * （worldY = -screenY、worldZ = ±THICK/2）相机矩阵与命中射线共享一位姿（camera3）
 * 大区覆盖全槽时全量打包否则增量；无深度缓冲——加法混合免排序
 */
import type { Renderer, RenderBatch, Vec3, Aabb } from '../yomi'
import { specOf } from './shape'
import type { TsuModel } from '../m/model'
import {
  C3D, GEO_SLOTS_EACH_ELEM, HOVER_SCALE, HALF_EXTRUDE_Z, SECTOR_VERTS,
  STROKE_LOCKED, STROKE_NORMAL, GPU,
} from '../helper/const'
import WGSL_COMMON from './wgsl/common.wgsl?raw'
import WGSL_BOX from './wgsl/box.wgsl?raw'
import WGSL_SECTOR from './wgsl/sector.wgsl?raw'
import WGSL_GROUND from './wgsl/ground.wgsl?raw'

type GPUX = any

/** 实例浮点数 — 与 WGSL 中的 Inst 结构镜像 */
const INST_FLOATS = 10

// —— 打包器：SoA 槽 → 世界实例（锚点语义与 2D 通道镜像）——

function packColor($out: Float32Array, $b: number, $fill: number): void {
  $out[$b + 6] = (($fill >>> 16) & 0xff) / 255
  $out[$b + 7] = (($fill >>> 8) & 0xff) / 255
  $out[$b + 8] = $fill & 0xff
  $out[$b + 9] = (($fill >>> 24) & 0xff) / 255 * C3D.ALPHA_MUL
}

function rectToWorld($m: TsuModel, $i: number, $out: Float32Array, $hover: boolean): void {
  const t = $m.anim[$i]
  const x = $m.x[$i], y = $m.y[$i], w = $m.w[$i], h = $m.h[$i]
  let _dw = w, _dh = h * t
  if ($hover) { _dw = w * HOVER_SCALE; _dh = h * t * HOVER_SCALE }
  const b = $i * INST_FLOATS
  // 锚点 = 柱顶中心、柱身向下延伸（与 rect.geo 的 rect(-w/2, 0, w, h) 同源）
  $out[b] = x
  $out[b + 1] = -(y + _dh / 2)
  $out[b + 2] = 0
  $out[b + 3] = _dw / 2
  $out[b + 4] = _dh / 2
  $out[b + 5] = HALF_EXTRUDE_Z
  packColor($out, b, $m.fill[$i])
}

function lineToWorld($m: TsuModel, $i: number, $out: Float32Array, $hover: boolean): void {
  const t = $m.anim[$i]
  const x = $m.x[$i], y = $m.y[$i]
  const dx = $m.w[$i] * t, dy = $m.h[$i] * t
  const b = $i * INST_FLOATS
  if (dx === 0 && dy === 0) { $out.fill(0, b, b + INST_FLOATS); return }
  const hy = ($hover ? STROKE_LOCKED / STROKE_NORMAL : 1) * C3D.THICK_LINE / 2
  $out[b] = x + dx / 2
  $out[b + 1] = -(y + dy / 2)
  $out[b + 2] = Math.atan2(-dy, dx)
  $out[b + 3] = Math.hypot(dx, dy) / 2
  $out[b + 4] = hy
  $out[b + 5] = HALF_EXTRUDE_Z
  packColor($out, b, $m.fill[$i])
}

function sectorToWorld($m: TsuModel, $i: number, $out: Float32Array, $hover: boolean): void {
  const t = $m.anim[$i]
  const a = $i * GEO_SLOTS_EACH_ELEM
  let _r = $m.aux[a] * t
  if ($hover) _r *= HOVER_SCALE
  const b = $i * INST_FLOATS
  $out[b] = $m.x[$i]
  $out[b + 1] = -$m.y[$i]
  $out[b + 2] = _r
  $out[b + 3] = -$m.aux[a + 1]
  $out[b + 4] = -($m.aux[a + 2] - $m.aux[a + 1]) * t
  $out[b + 5] = HALF_EXTRUDE_Z
  packColor($out, b, $m.fill[$i])
}

/** 唯一分发点 — 过滤器与打包器读同一 type[i] */
function coordXYToWorld($m: TsuModel, $i: number, $out: Float32Array, $hover: boolean): void {
  switch (specOf($m.id[$i])?.three) {
    case 'box': return rectToWorld($m, $i, $out, $hover)
    case 'bar': return lineToWorld($m, $i, $out, $hover)
    case 'sector': return sectorToWorld($m, $i, $out, $hover)
  }
}

// —— 材质：一个基元 = 一个 storage buffer = 一次 draw call ——

class Material {
  constructor(
    readonly prim: 'box' | 'bar' | 'sector' | 'ground',
    readonly entry: string,
    readonly verts: number,
  ) {}

  gpu: GPUX = null
  staging: Float32Array = new Float32Array(0)
  bindGroup: GPUX = null
  pipeline: GPUX = null
  capacity = 0
  drawCount = 0

  ensure($device: GPUX, $count: number): boolean {
    if ($count <= this.capacity) return false
    this.capacity = Math.max($count, this.capacity * 2, 64)
    this.staging = new Float32Array(this.capacity * INST_FLOATS)
    this.gpu?.destroy()
    this.gpu = $device.createBuffer({
      size: this.capacity * INST_FLOATS * 4,
      usage: GPU.USAGE_STORAGE_DST,
    })
    return true
  }
}

export class WebGPU3D implements Renderer {
  private canvas: HTMLCanvasElement | null = null
  private device: GPUX = null
  private context: GPUX = null
  private format = 'bgra8unorm'
  private uniform: GPUX = null
  private bgl: GPUX = null
  private groundBgl: GPUX = null
  private ground: [number, number, number, number] | null = null
  private materials: Material[] = []
  private uniformData = new Float32Array(GPU.SCENE_UNIFORM_FLOATS)
  ready = false
  private lost = false
  private texW = 0
  private texH = 0
  private msaaTex: GPUX = null
  private msaaView: GPUX = null

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

      this.device.pushErrorScope('validation')

      // 场景 uniform — 共享 binding 0（mat4 + 光照 + 视线 + neon + 地面）
      this.uniform = this.device.createBuffer({ size: 128, usage: GPU.USAGE_UNIFORM_DST })

      const shader = this.device.createShaderModule({
        code: [WGSL_COMMON, WGSL_BOX, WGSL_SECTOR, WGSL_GROUND].join('\n'),
      })

      const info = await (shader as any).getCompilationInfo()
      const errs = info.messages.filter(($m: any) => $m.type === 'error')
      if (errs.length > 0) {
        await this.device.popErrorScope()
        for (const m of errs) console.warn(`[tsukiyo] WGSL ${m.lineNum}:${m.linePos} ${m.message}`)
        return false
      }

      this.bgl = this.device.createBindGroupLayout({
        entries: [
          { binding: 0, visibility: 3, buffer: { type: 'uniform' } },
          { binding: 1, visibility: 1, buffer: { type: 'read-only-storage' } },
        ],
      })
      const layout = this.device.createPipelineLayout({ bindGroupLayouts: [this.bgl] })
      this.groundBgl = this.device.createBindGroupLayout({
        entries: [{ binding: 0, visibility: 3, buffer: { type: 'uniform' } }],
      })
      const groundLayout = this.device.createPipelineLayout({ bindGroupLayouts: [this.groundBgl] })

      this.materials = [
        new Material('box', 'vs_box', GPU.BOX_VERTS),
        new Material('bar', 'vs_box', GPU.BOX_VERTS),
        new Material('sector', 'vs_sector', SECTOR_VERTS),
        new Material('ground', 'vs_ground', GPU.GROUND_VERTS),
      ]

      for (const mat of this.materials) {
        const isGround = mat.prim === 'ground'
        const vConstants = isGround ? { GROUND_Z: -HALF_EXTRUDE_Z } : undefined
        const fConstants = isGround
          ? { GROUND_CELL: C3D.GROUND_CELL, GROUND_GLOW: C3D.GROUND_GLOW }
          : undefined

        mat.pipeline = this.device.createRenderPipeline({
          layout: isGround ? groundLayout : layout,
          vertex: {
            module: shader,
            entryPoint: mat.entry,
            constants: mat.prim === 'sector' ? { SECTOR_SEGS: C3D.SECTOR_SEGS } : vConstants,
          },
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

        if (isGround) {
          mat.bindGroup = this.device.createBindGroup({
            layout: this.groundBgl,
            entries: [{ binding: 0, resource: { buffer: this.uniform } }],
          })
        }
      }

      const verr = await this.device.popErrorScope()
      if (verr) {
        console.warn('[tsukiyo] WebGPU validation failed — falling back:', verr.message)
        return false
      }

      this.ready = true
      return true
    } catch ($e) {
      console.warn('[tsukiyo] WebGPU init failed — falling back:', $e)
      return false
    }
  }

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

  flush($model: TsuModel, $batch: RenderBatch): void {
    if (!this.ready || this.lost || !this.device || !this.context || !this.canvas) return
    const big = $batch.bigArea
    if (big.length === 0) return
    const { m: matrix, sight } = $batch.view
    if (!matrix || !sight) return

    const w = this.canvas.width
    const h = this.canvas.height
    if (w === 0 || h === 0) return
    if (w !== this.texW || h !== this.texH) this.rebuildTargets(w, h)

    const full = big.length === $model.count

    for (const mat of this.materials) {
      if (mat.prim === 'ground') {
        if (full) this.layGround($batch.view.area)
        continue
      }
      if (mat.ensure(this.device, $model.count)) this.rebind(mat)
      this.upload(mat, full ? this.packAll(mat, $model) : this.packSome(mat, $model, big))
    }

    const u = this.uniformData
    u.set(matrix)
    u[16] = C3D.LIGHT[0]; u[17] = C3D.LIGHT[1]; u[18] = C3D.LIGHT[2]; u[19] = C3D.AMBIENT
    u[20] = sight[0]; u[21] = sight[1]; u[22] = sight[2]; u[23] = C3D.RIM_I
    u[24] = C3D.NEON_CYAN[0]; u[25] = C3D.NEON_CYAN[1]; u[26] = C3D.NEON_CYAN[2]; u[27] = C3D.NEON_TINT
    const g = this.ground ?? [0, 0, 0, 0]
    u[28] = g[0]; u[29] = g[1]; u[30] = g[2]; u[31] = g[3]
    this.device.queue.writeBuffer(this.uniform, 0, u)

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

  /** 地面板 — 内容 AABB 翻转 Y 并外扩（空 model 保留上次） */
  private layGround($aabb: Aabb | null): void {
    if (!$aabb) return
    const cx = ($aabb[0][0] + $aabb[1][0]) / 2
    const cy = ($aabb[0][1] + $aabb[1][1]) / 2
    const hx = ($aabb[1][0] - $aabb[0][0]) / 2 * C3D.GROUND_MARGIN
    const hy = ($aabb[1][1] - $aabb[0][1]) / 2 * C3D.GROUND_MARGIN
    this.ground = [cx - hx, -(cy + hy), cx + hx, -(cy - hy)]
  }

  private packAll($mat: Material, $m: TsuModel): [number, number] | null {
    let _top = 0
    for (let _i = 0; _i < $m.count; _i++) {
      if (specOf($m.id[_i])?.three === $mat.prim) {
        coordXYToWorld($m, _i, $mat.staging, $m.hoverSlots.has(_i))
        _top = _i + 1
      } else {
        $mat.staging.fill(0, _i * INST_FLOATS, (_i + 1) * INST_FLOATS)
      }
    }
    $mat.drawCount = _top
    return _top > 0 ? [0, _top - 1] : null
  }

  private packSome($mat: Material, $m: TsuModel, $big: number[]): [number, number] | null {
    let _lo = Infinity, _hi = -Infinity
    for (const i of $big) {
      if (specOf($m.id[i])?.three !== $mat.prim) continue
      coordXYToWorld($m, i, $mat.staging, $m.hoverSlots.has(i))
      if (i < _lo) _lo = i
      if (i > _hi) _hi = i
    }
    return _lo <= _hi ? [_lo, _hi] : null
  }

  private rebind($mat: Material): void {
    $mat.bindGroup = this.device.createBindGroup({
      layout: this.bgl,
      entries: [
        { binding: 0, resource: { buffer: this.uniform } },
        { binding: 1, resource: { buffer: $mat.gpu } },
      ],
    })
  }

  private upload($mat: Material, $range: [number, number] | null): void {
    if (!$range) return
    const off = $range[0] * INST_FLOATS
    const len = ($range[1] - $range[0] + 1) * INST_FLOATS
    this.device.queue.writeBuffer($mat.gpu, off * 4, $mat.staging, off, len)
  }

  destroy(): void {
    for (const mat of this.materials) mat.gpu?.destroy?.()
    this.msaaTex?.destroy?.()
    this.uniform?.destroy?.()
    this.ready = false
  }
}

export type { Vec3 }
