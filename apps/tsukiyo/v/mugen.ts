/**
 * v/mugen — 無限月读天幕：写轮眼之月（左上）+ 地平线（底部）+ 斑剪影立绘（右下 侧身面朝月亮）
 * 一个 paint 一张天幕——屏幕锚定 纯视口比例布局 零数据耦合
 */
import { Hcvs_getDpr } from '../helper/canvas'
import { MUGEN, TAU } from '../helper/const'

/** 立绘五组路径 — 后发（含团扇）甲胄 面部 前发 细节刻线 */
type FigPaths = {
  back: Path2D
  body: Path2D
  face: Path2D
  front: Path2D
  detail: Path2D
}

/** 立绘剪影 — 单位身形（脚底 (0,0) 头顶 y=1 面朝 -x）首建后模块级复用 零每帧分配 */
let _fig: FigPaths | null = null

function buildFigure(): FigPaths {
  const back = new Path2D()
  const body = new Path2D()
  const face = new Path2D()
  const front = new Path2D()
  const detail = new Path2D()

  // —— 后发鬃 —— 颅后铺开六根尖 一路垂到腰下（斑的标志性长炸毛）
  back.moveTo(0.024, 0.96)
  back.quadraticCurveTo(0.055, 0.985, 0.1, 0.955)
  back.quadraticCurveTo(0.07, 0.93, 0.145, 0.885)
  back.quadraticCurveTo(0.095, 0.86, 0.185, 0.765)
  back.quadraticCurveTo(0.115, 0.735, 0.195, 0.64)
  back.quadraticCurveTo(0.105, 0.615, 0.165, 0.505)
  back.quadraticCurveTo(0.085, 0.485, 0.115, 0.385)
  back.quadraticCurveTo(0.07, 0.375, 0.05, 0.405)
  back.quadraticCurveTo(0.048, 0.52, 0.04, 0.64)
  back.quadraticCurveTo(0.038, 0.75, 0.03, 0.86)
  back.closePath()
  // 团扇 — 斑的标志性武器 左手前置悬在身前空区
  back.ellipse(-0.138, 0.62, 0.058, 0.05, -0.35, 0, TAU)

  // —— 甲胄 —— 高领 尖领片立在颈后
  body.moveTo(0.008, 0.805)
  body.lineTo(0.026, 0.878)
  body.lineTo(0.046, 0.842)
  body.lineTo(0.05, 0.87)
  body.lineTo(0.066, 0.828)
  body.lineTo(0.056, 0.798)
  body.closePath()
  // 胸甲 — 肩线收束到腰
  body.moveTo(-0.062, 0.782)
  body.quadraticCurveTo(-0.07, 0.7, -0.05, 0.558)
  body.lineTo(0.05, 0.558)
  body.quadraticCurveTo(0.072, 0.7, 0.062, 0.782)
  body.closePath()
  // 左肩甲 两层叠片（前肩）
  body.moveTo(-0.02, 0.812)
  body.quadraticCurveTo(-0.08, 0.815, -0.118, 0.778)
  body.quadraticCurveTo(-0.075, 0.742, -0.02, 0.748)
  body.closePath()
  body.moveTo(-0.022, 0.796)
  body.quadraticCurveTo(-0.07, 0.798, -0.1, 0.766)
  body.quadraticCurveTo(-0.062, 0.738, -0.022, 0.744)
  body.closePath()
  // 右肩甲 两层叠片（后肩 大半掩于后发下）
  body.moveTo(0.018, 0.812)
  body.quadraticCurveTo(0.082, 0.818, 0.12, 0.782)
  body.quadraticCurveTo(0.075, 0.745, 0.018, 0.75)
  body.closePath()
  body.moveTo(0.02, 0.796)
  body.quadraticCurveTo(0.07, 0.8, 0.1, 0.768)
  body.quadraticCurveTo(0.062, 0.74, 0.02, 0.746)
  body.closePath()
  // 左臂 — 垂手扶扇 上臂贴身 前臂微前伸
  body.moveTo(-0.092, 0.775)
  body.quadraticCurveTo(-0.118, 0.72, -0.108, 0.665)
  body.quadraticCurveTo(-0.1, 0.61, -0.092, 0.568)
  body.lineTo(-0.068, 0.572)
  body.quadraticCurveTo(-0.078, 0.64, -0.088, 0.7)
  body.quadraticCurveTo(-0.075, 0.74, -0.068, 0.77)
  body.closePath()
  // 右臂 — 后侧垂手 大半掩于后发
  body.moveTo(0.088, 0.775)
  body.quadraticCurveTo(0.112, 0.72, 0.102, 0.665)
  body.quadraticCurveTo(0.094, 0.615, 0.088, 0.578)
  body.lineTo(0.068, 0.582)
  body.quadraticCurveTo(0.078, 0.65, 0.07, 0.7)
  body.quadraticCurveTo(0.072, 0.74, 0.066, 0.768)
  body.closePath()
  // 腰带
  body.moveTo(-0.056, 0.558)
  body.lineTo(0.056, 0.558)
  body.lineTo(0.06, 0.518)
  body.lineTo(-0.06, 0.518)
  body.closePath()
  // 腰甲片 三片垂片护胯
  body.moveTo(-0.058, 0.518)
  body.lineTo(-0.062, 0.42)
  body.lineTo(-0.04, 0.435)
  body.lineTo(-0.032, 0.518)
  body.closePath()
  body.moveTo(-0.02, 0.518)
  body.lineTo(-0.026, 0.408)
  body.lineTo(0.004, 0.408)
  body.lineTo(0.016, 0.518)
  body.closePath()
  body.moveTo(0.026, 0.518)
  body.lineTo(0.048, 0.432)
  body.lineTo(0.064, 0.445)
  body.lineTo(0.058, 0.518)
  body.closePath()
  // 左腿 + 战靴（前腿 脚尖朝 -x）
  body.moveTo(-0.048, 0.468)
  body.lineTo(-0.008, 0.462)
  body.quadraticCurveTo(-0.014, 0.3, -0.012, 0.16)
  body.lineTo(-0.016, 0.058)
  body.lineTo(-0.104, 0.048)
  body.lineTo(-0.104, 0.012)
  body.lineTo(-0.052, 0.01)
  body.quadraticCurveTo(-0.07, 0.09, -0.066, 0.16)
  body.quadraticCurveTo(-0.07, 0.32, -0.058, 0.465)
  body.closePath()
  // 右腿 + 战靴（后腿 微错步）
  body.moveTo(0.012, 0.462)
  body.lineTo(0.046, 0.466)
  body.quadraticCurveTo(0.058, 0.32, 0.056, 0.16)
  body.quadraticCurveTo(0.064, 0.09, 0.052, 0.01)
  body.lineTo(0.006, 0.012)
  body.lineTo(0.006, 0.048)
  body.lineTo(0.022, 0.056)
  body.quadraticCurveTo(0.018, 0.3, 0.012, 0.462)
  body.closePath()

  // —— 面部 —— 侧脸轮廓（额 眉骨 鼻梁 鼻尖 人中 唇 下颌）+ 颈
  face.moveTo(-0.03, 0.778)
  face.lineTo(-0.03, 0.838)
  face.lineTo(-0.062, 0.847)
  face.quadraticCurveTo(-0.072, 0.852, -0.07, 0.858)
  face.lineTo(-0.063, 0.862)
  face.quadraticCurveTo(-0.073, 0.867, -0.066, 0.873)
  face.quadraticCurveTo(-0.086, 0.878, -0.085, 0.886)
  face.quadraticCurveTo(-0.074, 0.894, -0.07, 0.9)
  face.lineTo(-0.074, 0.912)
  face.lineTo(-0.066, 0.92)
  face.quadraticCurveTo(-0.06, 0.948, -0.038, 0.962)
  face.quadraticCurveTo(-0.005, 0.976, 0.026, 0.958)
  face.quadraticCurveTo(0.044, 0.93, 0.036, 0.888)
  face.quadraticCurveTo(0.03, 0.862, 0.004, 0.852)
  face.lineTo(0.022, 0.815)
  face.lineTo(0.022, 0.778)
  face.closePath()

  // —— 前发 —— 刘海两缕压额角 鬓发一缕贴颊垂到下颌
  front.moveTo(-0.038, 0.962)
  front.quadraticCurveTo(-0.075, 0.955, -0.088, 0.912)
  front.lineTo(-0.07, 0.908)
  front.quadraticCurveTo(-0.062, 0.938, -0.036, 0.948)
  front.closePath()
  front.moveTo(-0.03, 0.958)
  front.quadraticCurveTo(-0.064, 0.944, -0.06, 0.91)
  front.lineTo(-0.048, 0.908)
  front.quadraticCurveTo(-0.038, 0.936, -0.018, 0.95)
  front.closePath()
  front.moveTo(-0.026, 0.93)
  front.quadraticCurveTo(-0.052, 0.9, -0.058, 0.852)
  front.lineTo(-0.042, 0.848)
  front.quadraticCurveTo(-0.034, 0.893, -0.014, 0.916)
  front.closePath()
  // 胸前长缕 — 耳后垂到胸甲前 再一缕落背后肩侧
  front.moveTo(0, 0.868)
  front.quadraticCurveTo(-0.058, 0.83, -0.07, 0.72)
  front.quadraticCurveTo(-0.08, 0.63, -0.068, 0.562)
  front.lineTo(-0.048, 0.568)
  front.quadraticCurveTo(-0.062, 0.64, -0.052, 0.72)
  front.quadraticCurveTo(-0.036, 0.808, 0.014, 0.845)
  front.closePath()
  front.moveTo(0.028, 0.868)
  front.quadraticCurveTo(0.08, 0.82, 0.092, 0.73)
  front.quadraticCurveTo(0.098, 0.65, 0.084, 0.595)
  front.lineTo(0.064, 0.602)
  front.quadraticCurveTo(0.08, 0.68, 0.066, 0.755)
  front.quadraticCurveTo(0.05, 0.822, 0.01, 0.86)
  front.closePath()

  // —— 细节刻线 —— 只描边不填充 眉 眼 嘴
  detail.moveTo(-0.07, 0.921)
  detail.lineTo(-0.044, 0.926)
  detail.moveTo(-0.056, 0.904)
  detail.lineTo(-0.034, 0.901)
  detail.moveTo(-0.048, 0.902)
  detail.arc(-0.048, 0.902, 0.005, 0, TAU)
  detail.moveTo(-0.064, 0.86)
  detail.lineTo(-0.05, 0.859)
  // 后发发丝 三条沿尖峰走向
  detail.moveTo(0.045, 0.93)
  detail.quadraticCurveTo(0.11, 0.9, 0.135, 0.83)
  detail.moveTo(0.04, 0.85)
  detail.quadraticCurveTo(0.115, 0.78, 0.145, 0.68)
  detail.moveTo(0.038, 0.72)
  detail.quadraticCurveTo(0.11, 0.64, 0.13, 0.54)
  // 胸甲中缝 腰带线 左腿甲缝
  detail.moveTo(-0.012, 0.78)
  detail.lineTo(-0.01, 0.56)
  detail.moveTo(-0.054, 0.538)
  detail.lineTo(0.054, 0.538)
  detail.moveTo(-0.038, 0.46)
  detail.quadraticCurveTo(-0.044, 0.3, -0.038, 0.15)
  // 团扇扇骨 三条
  detail.moveTo(-0.108, 0.59)
  detail.lineTo(-0.16, 0.65)
  detail.moveTo(-0.098, 0.608)
  detail.lineTo(-0.172, 0.63)
  detail.moveTo(-0.126, 0.576)
  detail.lineTo(-0.148, 0.664)

  return { back, body, face, front, detail }
}

/** 无限月读天幕 — LayerConf.paint 自绘层钩子（z:-1 天幕 数据在其下生长） */
export function drawMugen($ctx: CanvasRenderingContext2D, $w: number, $h: number): void {
  const dpr = Hcvs_getDpr()
  $ctx.save()
  $ctx.setTransform(dpr, 0, 0, dpr, 0, 0)   // 回 CSS 屏幕系——视怎么动天幕不动

  // ① 写轮眼之月 — 红晕渐变盘 + 三勾玉 + 瞳孔
  const cx = $w * MUGEN.moonX
  const cy = $h * MUGEN.moonY
  const r = Math.min($w, $h) * MUGEN.moonR
  const halo = $ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r)
  halo.addColorStop(0, MUGEN.moonCore)
  halo.addColorStop(0.72, MUGEN.moonHalo)
  halo.addColorStop(1, MUGEN.moonEdge)
  $ctx.fillStyle = halo
  $ctx.beginPath()
  $ctx.arc(cx, cy, r, 0, TAU)
  $ctx.fill()
  $ctx.fillStyle = MUGEN.tomoeFill
  const dot = r * MUGEN.tomoeDot
  const tr = r * MUGEN.tomoeR
  for (let _i = 0; _i < 3; _i++) {
    const a = -Math.PI / 2 + (_i / 3) * TAU
    $ctx.beginPath()
    $ctx.arc(cx + Math.cos(a) * tr, cy + Math.sin(a) * tr, dot, 0, TAU)
    $ctx.fill()
  }
  $ctx.beginPath()
  $ctx.arc(cx, cy, dot * 1.3, 0, TAU)
  $ctx.fill()

  // ② 地平线 — 水平线 + 地面渐变 + 月下倒影光带
  const hy = $h * MUGEN.horizonY
  const ground = $ctx.createLinearGradient(0, hy, 0, $h)
  ground.addColorStop(0, MUGEN.groundFill)
  ground.addColorStop(1, MUGEN.groundDeep)
  $ctx.fillStyle = ground
  $ctx.fillRect(0, hy, $w, $h - hy)
  const reflect = $ctx.createLinearGradient(0, hy, 0, $h)
  reflect.addColorStop(0, MUGEN.reflectTop)
  reflect.addColorStop(1, MUGEN.reflectBottom)
  $ctx.fillStyle = reflect
  $ctx.fillRect(cx - r * 0.55, hy, r * 1.1, $h - hy)
  $ctx.strokeStyle = MUGEN.horizonStroke
  $ctx.lineWidth = 1.5
  $ctx.beginPath()
  $ctx.moveTo(0, hy)
  $ctx.lineTo($w, hy)
  $ctx.stroke()

  // ③ 斑剪影立绘 — 脚底锚在地平线 五组分层 后发→甲胄→面部→前发→刻线
  if (!_fig) _fig = buildFigure()
  const s = $h * MUGEN.figH
  $ctx.translate($w * MUGEN.figX, hy)
  $ctx.scale(s, -s)                  // canvas y 向下——负号把「头顶 y=1」翻到屏幕上方
  $ctx.lineWidth = MUGEN.figLineWidth
  $ctx.strokeStyle = MUGEN.figureStroke
  const draw = ($p: Path2D, $fill: string): void => {
    $ctx.fillStyle = $fill
    $ctx.fill($p)
    $ctx.stroke($p)
  }
  draw(_fig.back, MUGEN.hairFill)
  draw(_fig.body, MUGEN.figureFill)
  draw(_fig.face, MUGEN.faceFill)
  draw(_fig.front, MUGEN.hairFill)
  $ctx.lineWidth = MUGEN.figDetailWidth
  $ctx.strokeStyle = MUGEN.figureDetail
  $ctx.stroke(_fig.detail)

  $ctx.restore()
}
