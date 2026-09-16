/**
 * render-3d — WebGPU 3D 后端（世界系公理）
 *
 * 公理: 世界系 = SoA 屏幕系 + Z 轴
 *   worldX = screenX, worldY = -screenY（Y 翻转，K=0 只产生整体平移，被取景吸收）
 *   worldZ = 挤出厚度（±THICK/2），单位与屏幕系同为 CSS px
 *   SoA 终态（x/y/w/h/fill/anim/aux）即 3D 几何的 2D 位面 — 本模块对 SoA 只读。
 *
 * 相机归属: 本模块不实现相机 — 渲染矩阵由 spatial 聚合区（camera3.ts 取景）每帧产出，
 *   经 engine draw task 透传入 flush 第4参；渲染与命中同源（同一 Camera3 位姿），结构性防漂移。
 *
 * 节律: 无自有循环/定时器/Promise 并发。flush 由 scheduler tick → engine draw 阶段
 *   同步调用（与 Canvas2D 完全一致）。唯一 tick 外异步是 device.lost（见 init）。
 *
 * 增量语义（与 2D 脏区域同构）:
 *   全量 pack ⟺ 大名单.length === count（结构性变化 → 全 dirty → 全量大名单：首帧/换数据）
 *     职责: 打包全部 + 非本原语槽位写零（退化实例不可见）+ 重算 drawCount
 *   增量 pack ⟺ 其余（纯 anim/hover 帧）— 仅覆写 大名单∩本原语 的槽位，GPU 未动槽位保留上帧
 *   槽位 = 元素索引（稳定映射，永不紧凑化重排）
 *   regionDrawing 参数重释为"重绘信号"（混合无深度遮挡，收到即整帧重绘）
 *   大名单为空 → 不 flush，上一帧持久保留
 *
 * 玻璃透明（v2 视觉基线）:
 *   - 标准 alpha 混合开启，fill 的 alpha 通道正式生效
 *   - 无深度缓冲 — 同一盒体背面/侧面/顶面全部参与混合，"玻璃盒"六面透视可见；
 *     柱后之柱、扇段内部腔体均可透视；顺带消除 z-fighting 与实例排序问题（等透明度乱序混合瑕疵可忽略）
 *   - Lambert 光照区分面朝向（顶亮/侧暗/前后明暗差），透明叠加后立体感仍清晰可读
 *
 * 新增一种 3D 原语材料（三步）:
 *   ① v/wgsl/xxx.wgsl — Inst 结构（只用 f32 标量，与 TS 侧 40 字节连续写保持字节级一致，
 *      vec3 成员会触发 WGSL 16 字节对齐陷阱）+ 几何表/细分函数 + @vertex 入口
 *      （依赖 common.wgsl 的 Camera/VOut/绑定，拼接后编译；细分段数用 override + pipeline constants 注入）
 *   ② xxxToWorld — 读 SoA 终态翻 Y 挤出 Z，逐字镜像 2D drawBatch 对应 case 的 anim/hover 锚点语义
 *   ③ coordXYToWorld 注册分派 — switch(model.type[i]) 加一个 case；GPU 资源由 WebGPU3D 统一托管
 *
 * WGSL 管理: 着色器为独立 .wgsl 文件（编辑器 LSP 保存即查语法），Vite ?raw 加载，
 *   动态参数零字符串插值 — 光照走 Camera uniform，段数走 pipeline override。
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

/* WebGPU 类型守卫 — 项目无 @webgpu/types 时以 any 运行 */
type GPU = any

/** 实例浮点数 — = BoxInst/SectorInst 字段数（10×f32=40B），TS 侧连续写与 WGSL 结构同源 */
const INST_FLOATS = 10

// —— 专家 — SoA 2D 终态 → 世界系实例（逐字镜像 2D drawBatch 各 case 的锚点语义）——
// coordXYToWorld 是三者的统一包装器（见下）；命名 = 图表几何 → world 的 A→B 家族

/** packed RGBA → 实例颜色（0~1 归一在 pack 时完成，GPU 免除逐顶点换算）
 *  alpha × ALPHA_MUL — 玻璃透明倍率（C3D 调参，六面叠加后仍可透视） */
function packColor($out: Float32Array, $b: number, $fill: number): void {
  $out[$b + 6] = (($fill >>> 16) & 0xff) / 255
  $out[$b + 7] = (($fill >>> 8) & 0xff) / 255
  $out[$b + 8] = $fill & 0xff
  $out[$b + 9] = (($fill >>> 24) & 0xff) / 255 * C3D.ALPHA_MUL
}

/** Rect → 盒体。anim 底部锚点生长 + hover 底部中心缩放（镜像 2D Rect case） */
function rectToWorld($m: TsuModel, $i: number, $out: Float32Array, $hover: boolean): void {
  const t = $m.anim[$i]
  const x = $m.x[$i], y = $m.y[$i], w = $m.w[$i], h = $m.h[$i]
  let _dw = w, _dh = h * t
  if ($hover) { _dw = w * HOVER_SCALE; _dh = h * t * HOVER_SCALE }
  const $b = $i * INST_FLOATS
  $out[$b] = x + (w - _dw) / 2            // 中心 x 不变
  $out[$b + 1] = -(y + h - _dh / 2)        // 底部锚点（Y 翻转）
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
  // hover 加粗 — 与 2D STROKE_LOCKED/STROKE_NORMAL 同比（派生比值，禁散布 2×）
  const hy = ($hover ? STROKE_LOCKED / STROKE_NORMAL : 1) * C3D.THICK_LINE / 2
  $out[$b] = x + dx / 2
  $out[$b + 1] = -(y + dy / 2)
  $out[$b + 2] = Math.atan2(-dy, dx)     // 世界系角度（Y 翻转）
  $out[$b + 3] = len / 2
  $out[$b + 4] = hy
  $out[$b + 5] = HALF_EXTRUDE_Z         // 与柱体同 Z 厚度（玻璃混合下无共面问题）
  packColor($out, $b, $m.fill[$i])
}

/**
 * Arc → 圆柱扇段。anim 半径生长 + 角度扫描 + hover 半径缩放（镜像 2D Arc case）
 * 镜像重参数化: worldAng = -screenAng → 起始角取 -startAng 固定，扫描角取负（世界系正向消费）
 */
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

/**
 * coordXYToWorld — 图表几何 → 世界系实例 的统一包装器
 * 读 model.type[i] 分派到专家（rectToWorld / lineToWorld / sectorToWorld）；
 * 分派与材料循环过滤双读同一 model.type[i]（同 tick 同槽位，值不可能漂移）
 */
function coordXYToWorld($m: TsuModel, $i: number, $out: Float32Array, $hover: boolean): void {
  switch ($m.type[$i]) {
    case P.Rect: return rectToWorld($m, $i, $out, $hover)
    case P.Line: return lineToWorld($m, $i, $out, $hover)
    case P.Arc: return sectorToWorld($m, $i, $out, $hover)
  }
}


// —— Material — 原子材料 = 静态注册字段 + 私有 GPU 资源 ——

/**
 * 1 原语 = 1 注册项 = 1 storage buffer = 1 draw call；地台（'ground'）为固定场景件 —
 * 单实例 uniform 四至驱动，无 storage。表退化为纯 GPU 配置 { prim, entry, verts } —
 * pack 循环统一走 coordXYToWorld 包装器。GPU 资源随材料实例托管，互不共享互不牵连。
 */
class Material {
  /** prim = SoA 原语（实例流）；'ground' = 场景件（单实例，uniform 驱动） */
  constructor(
    readonly prim: Prim | 'ground',
    readonly entry: string,
    readonly verts: number,
  ) {}

  // 运行时 GPU 资源（WebGPU3D 统一创建托管）
  gpu: GPU = null
  staging: Float32Array = new Float32Array(0)
  bindGroup: GPU = null
  pipeline: GPU = null
  capacity = 0        // 实例容量（元素数）
  drawCount = 0       // 本原语实例上界（全量 pack 时重算，draw 用）

  /** 容量自增 — GPU 与 staging 同步增长（返回是否增容，调用方据此重挂 bindGroup） */
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
  private bgl: GPU = null          // bind group layout — SoA 材料（uniform + 实例 storage）
  private groundBgl: GPU = null    // bind group layout — 地台（uniform-only，无实例 storage）
  /** 地台四至 — 世界系 x0,y0,x1,y1（layGround 全量帧聚合；空模型保留上一帧） */
  private ground: [number, number, number, number] | null = null
  private materials: Material[] = []
  /** 场景 uniform 暂存 — 128B 连续写缓冲（帧间复用，零每帧分配） */
  private uniformData = new Float32Array(GPU.SCENE_UNIFORM_FLOATS)
  ready = false

  /** device.lost 唯一写者 — 全设计唯一 tick 外异步点（flush 首行短路 + ready 反映） */
  private lost = false

  // 尺寸分支缓存 — 重建 MSAA 纹理的判定依据
  private texW = 0
  private texH = 0
  private msaaTex: GPU = null
  private msaaView: GPU = null

  /** GPU 初始化 — 任一步失败返回 false，工厂回退 Canvas2D（与浏览器不支持 WebGPU 同一出口） */
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

      // 验证错误兜底 — GPU 对象创建的验证错误不抛异常、只产生 invalid 对象（如布局与 shader
      // 可见性不匹配），黑屏且连锁 SetPipeline/Submit 报错；error scope 捕获 → 回退 Canvas2D
      this.device.pushErrorScope('validation')

      // 场景 uniform — 各材料的 bind group 共享同一 buffer（binding 0）
      // 128B = mat4x4(64) + lightDir(16) + viewRim(16) + neon(16) + ground(16)：全部参数每帧随矩阵一起写，零插值
      this.uniform = this.device.createBuffer({ size: 128, usage: GPU.USAGE_UNIFORM_DST })  // UNIFORM | COPY_DST

      const shader = this.device.createShaderModule({
        code: [WGSL_COMMON, WGSL_BOX, WGSL_SECTOR, WGSL_GROUND].join('\n'),
      })

      // WGSL 编译诊断 — 同步 API 编译错误只产生 invalid 对象不抛异常，
      // 主动查 error 级消息 → 返回 false → 工厂回退 Canvas2D（避免黑屏）
      const info = await (shader as any).getCompilationInfo()
      const errs = info.messages.filter(($m: any) => $m.type === 'error')
      if (errs.length > 0) {
        await this.device.popErrorScope()   // 平衡上方 push，避免作用域泄漏
        for (const m of errs) console.warn(`[tsukiyo] WGSL ${m.lineNum}:${m.linePos} ${m.message}`)
        return false
      }
      // bind group layout: 0=相机 uniform, 1=材料实例 storage
      // binding 0 需 VERTEX|FRAGMENT(=3) — fs_lambert 也读 camera.lightDir；
      // 只给 VERTEX 会导致 pipeline 布局验证失败（invalid RenderPipeline）
      this.bgl = this.device.createBindGroupLayout({
        entries: [
          { binding: 0, visibility: 3, buffer: { type: 'uniform' } },
          { binding: 1, visibility: 1, buffer: { type: 'read-only-storage' } },
        ],
      })
      const layout = this.device.createPipelineLayout({ bindGroupLayouts: [this.bgl] })
      // 地台布局 — 仅 binding 0（uniform-only）：场景件无实例 storage
      this.groundBgl = this.device.createBindGroupLayout({
        entries: [{ binding: 0, visibility: 3, buffer: { type: 'uniform' } }],
      })
      const groundLayout = this.device.createPipelineLayout({ bindGroupLayouts: [this.groundBgl] })

      // 材料注册表 — 1 原语 = 1 注册项（Rect/Line 共享 vs_box 着色器，各自独立 buffer/bindGroup）
      // + 地台（场景件：vs_ground 单实例，uniform 四至驱动）
      this.materials = [
        new Material(P.Rect, 'vs_box', GPU.BOX_VERTS),
        new Material(P.Line, 'vs_box', GPU.BOX_VERTS),
        new Material(P.Arc, 'vs_sector', SECTOR_VERTS),
        new Material('ground', 'vs_ground', GPU.GROUND_VERTS),
      ]

      for (const mat of this.materials) {
        const isGround = mat.prim === 'ground'
        // override 分 stage 注入 — GROUND_Z 在 vs（顶点高度）、CELL/GLOW 在 fs（距离场周期/辉光）
        const vConstants = isGround ? { GROUND_Z: -HALF_EXTRUDE_Z } : undefined
        const fConstants = isGround
          ? { GROUND_CELL: C3D.GROUND_CELL, GROUND_GLOW: C3D.GROUND_GLOW }
          : undefined

        mat.pipeline = this.device.createRenderPipeline({
          layout: isGround ? groundLayout : layout,
          vertex: {
            module: shader,
            entryPoint: mat.entry,
            // override 通道（GPUProgrammableStage 成员，须在 stage 内）— 扇段细分段数由 C3D 注入
            constants: mat.prim === P.Arc ? { SECTOR_SEGS: C3D.SECTOR_SEGS } : vConstants,
          },
          // 霓虹叠加 — additive 混合（dst 加权 → 越叠越亮 = 全息发光）；无 depthStencil
          // （六面全可见，叠加代替遮挡；可交换混合 → 无需实例排序，绘制顺序无关）
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

        // 地台 bindGroup — uniform-only（场景件无实例 storage，一次性挂接）
        if (isGround) {
          mat.bindGroup = this.device.createBindGroup({
            layout: this.groundBgl,
            entries: [{ binding: 0, resource: { buffer: this.uniform } }],
          })
        }
      }

      // 无编译错误但 pipeline/bgl 验证失败（如可见性不匹配）在此捕获 — 详见方法头 push
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

  /** 尺寸变化 → 重建 MSAA 纹理（backing size 由 engine 的 retina 管理，本处只消费） */
  private rebuildTargets($w: number, $h: number): void {
    this.msaaTex?.destroy?.()
    this.msaaTex = this.device.createTexture({
      size: [$w, $h], format: this.format, sampleCount: GPU.MSAA_SAMPLES,
      usage: GPU.USAGE_RENDER_ATTACH,   // RENDER_ATTACHMENT
    })
    this.msaaView = this.msaaTex.createView()
    this.texW = $w
    this.texH = $h
  }

  /** 第5/6参 clipMatrix/sight — spatial 聚合区产出的本帧相机矩阵与视线（同一次取景，渲染与命中同源） */
  flush($model: TsuModel, $regionDrawing: Bounds | null, $regionBigDrawing?: number[],
        $clipMatrix?: Float32Array | null, $sight?: Vec3 | null): void {
    if (!this.ready || this.lost || !this.device || !this.context || !this.canvas) return
    const big = $regionBigDrawing ?? []
    if (big.length === 0) return                       // 无变化 → 帧持久
    if (!$clipMatrix || !$sight) return                // 相机未就绪（空模型）→ 无可绘制（同源同生死）

    const w = this.canvas.width
    const h = this.canvas.height
    if (w === 0 || h === 0) return
    if (w !== this.texW || h !== this.texH) this.rebuildTargets(w, h)

    // 全量/增量判定 — 从既有信号直接派生（结构性变化 → 全 dirty → 全量大名单）
    const full = big.length === $model.count

    for (const mat of this.materials) {
      if (mat.prim === 'ground') {                     // 场景件 — 四至聚合（全量帧）后 uniform 下发
        if (full) this.layGround($model)
        continue
      }
      if (mat.ensure(this.device, $model.count)) this.rebind(mat)
      const range = full ? this.packAll(mat, $model) : this.packSome(mat, $model, big)
      this.upload(mat, range)
    }

    // 场景 uniform — 一次 128B 写入（矩阵/视线来自 spatial 聚合区，本模块零相机逻辑）
    // 128B: clipForTsukiyoWorld(16f) + lightDir.xyz+ambient(4f) + sight.xyz+RIM_I(4f)
    //       + neon.rgb+NEON_TINT(4f) + ground 四至(4f)（与 common.wgsl 的 Camera 结构字节对齐）
    const u = this.uniformData
    u.set($clipMatrix)
    u[16] = C3D.LIGHT[0]; u[17] = C3D.LIGHT[1]; u[18] = C3D.LIGHT[2]; u[19] = C3D.AMBIENT
    u[20] = $sight[0];    u[21] = $sight[1];    u[22] = $sight[2];    u[23] = C3D.RIM_I
    u[24] = C3D.NEON_CYAN[0]; u[25] = C3D.NEON_CYAN[1]; u[26] = C3D.NEON_CYAN[2]; u[27] = C3D.NEON_TINT
    const g = this.ground ?? [0, 0, 0, 0]
    u[28] = g[0]; u[29] = g[1]; u[30] = g[2]; u[31] = g[3]
    this.device.queue.writeBuffer(this.uniform, 0, u)

    // 单 render pass — 逐有实例材料混合绘制（无深度 — 玻璃透视语义）
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
        // 场景件 — 四至就绪即单实例绘制（bindGroup 于 init 一次性挂接）
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

  /**
   * 铺地 — 地台四至聚合（全量帧调用；结构性变化才改盒，滚动帧不重算）
   * 聚合 model.aabb 总边界 → 翻 Y × GROUND_MARGIN 外扩 → 写 this.ground
   * （与 CoordMapper3D.update 的聚合区遍历同一公理：SoA 2D 位面 + 翻 Y）
   */
  private layGround($m: TsuModel): void {
    const box = $m.contentBounds()   // 内容总边界单源实现（消聚合双实现）
    if (!box) return                 // 空模型 — 保留上一帧四至（地台稳定不闪烁）
    // 翻 Y（图表系 → 世界系）+ 外扩余量（保持中心不动）
    const cx = (box[0][0] + box[1][0]) / 2, cy = (box[0][1] + box[1][1]) / 2
    const hx = (box[1][0] - box[0][0]) / 2 * C3D.GROUND_MARGIN
    const hy = (box[1][1] - box[0][1]) / 2 * C3D.GROUND_MARGIN
    this.ground = [cx - hx, -(cy + hy), cx + hx, -(cy - hy)]
  }

  /** 全量 pack — 全部槽位（非本原语写零 = 退化不可见）+ drawCount 重算。返回上传区间 */
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

  /** 增量 pack — 仅 大名单∩本原语 槽位（anim/hover 帧），GPU 未动槽位保留上一帧。返回上传区间 */
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

  /** bindGroup 挂接（camera uniform + 本材料 storage） */
  private rebind($mat: Material): void {
    $mat.bindGroup = this.device.createBindGroup({
      layout: this.bgl,
      entries: [
        { binding: 0, resource: { buffer: this.uniform } },
        { binding: 1, resource: { buffer: $mat.gpu } },
      ],
    })
  }

  /** 上传 — pack 产出的最小连续槽位区间（writeBuffer 在调用时刻快照，下一帧覆写 staging 安全） */
  private upload($mat: Material, $range: [number, number] | null): void {
    if (!$range) return
    const off = $range[0] * INST_FLOATS
    const len = ($range[1] - $range[0] + 1) * INST_FLOATS
    this.device.queue.writeBuffer($mat.gpu, off * 4, $mat.staging, off, len)
  }

  /** 释放 GPU 资源 — Engine 生命周期暂无 teardown 调用点，页面卸载由 canvas GC 兜底 */
  destroy(): void {
    for (const mat of this.materials) { mat.gpu?.destroy?.() }
    this.msaaTex?.destroy?.()
    this.uniform?.destroy?.()
    this.ready = false
  }
}
