// sector — 圆柱扇段材料（消费 Arc）
// 扇段 = 顶/底盖 fan + 外弧壁 + 两条平直侧壁
// 实例: [圆心.xy, 半径, 起始角, 扫描角, 半深, 颜色.rgba]
// 依赖 common.wgsl 的 Camera / VOut / camera 绑定（拼接后编译）
//
// 角度已由 packSector 完成镜像重参数化（worldAng = -screenAng），此处只在世界系正向消费
// SECTOR_SEGS 经 pipeline override 由 TS 侧注入（createRenderPipeline constants 通道）

struct SectorInst {
  cx: f32,
  cy: f32,
  rad: f32,
  start: f32,
  sweep: f32,
  hz: f32,
  r: f32,
  g: f32,
  b: f32,
  a: f32,
};

@group(0) @binding(1) var<storage> sectorInst: array<SectorInst>;

override SECTOR_SEGS: u32 = 24;

@vertex
fn vs_sector(
  @builtin(vertex_index) vi: u32,
  @builtin(instance_index) ii: u32,
) -> VOut {
  let inst = sectorInst[ii];
  let S3 = SECTOR_SEGS * 3u;
  let S6 = SECTOR_SEGS * 6u;

  var ang = inst.start;
  var z = inst.hz;
  var nrm = vec3f(0.0, 0.0, 1.0);
  var radial = 0.0;   // 1.0 = 弧上点, 0.0 = 圆心

  if (vi < S3) {
    // 顶盖 fan — 每段 3 顶点: 圆心, p_q, p_{q+1}（法线 +Z）
    let q = vi / 3u;
    let c = vi % 3u;
    ang = inst.start + inst.sweep * (f32(q) + f32(select(0u, 1u, c == 2u))) / f32(SECTOR_SEGS);
    radial = select(1.0, 0.0, c == 0u);
  } else if (vi < S6) {
    // 底盖 fan — 同拓扑，z 翻转，法线 -Z
    let u = vi - S3;
    let q = u / 3u;
    let c = u % 3u;
    ang = inst.start + inst.sweep * (f32(q) + f32(select(0u, 1u, c == 2u))) / f32(SECTOR_SEGS);
    radial = select(1.0, 0.0, c == 0u);
    z = -inst.hz;
    nrm = vec3f(0.0, 0.0, -1.0);
  } else if (vi < S6 + 12u) {
    // 平直侧壁 ×2 — e=0 起始边 / e=1 终止边，quad: 中心top,中心bot,弧top / 弧top,中心bot,弧bot
    // 法线取径向（与外弧壁明暗连续的近似，cull off 无绕序问题）
    let u = vi - S6;
    let e = u / 6u;
    let c = u % 6u;
    ang = select(inst.start, inst.start + inst.sweep, e == 1u);
    z = select(inst.hz, -inst.hz, c == 1u || c == 4u);
    radial = select(1.0, 0.0, c == 0u || c == 1u || c == 4u);
    nrm = vec3f(cos(ang), sin(ang), 0.0);
  } else {
    // 外弧壁 — 每段 quad（p_q^top, p_q^bot, p_{q+1}^top）+（p_{q+1}^top, p_q^bot, p_{q+1}^bot），法线径向
    let u = vi - S6 - 12u;
    let q = u / 6u;
    let c = u % 6u;
    let useNext = select(0u, 1u, c == 2u || c == 3u || c == 5u);
    ang = inst.start + inst.sweep * (f32(q) + f32(useNext)) / f32(SECTOR_SEGS);
    z = select(inst.hz, -inst.hz, c == 1u || c == 4u || c == 5u);
    nrm = vec3f(cos(ang), sin(ang), 0.0);
    radial = 1.0;
  }

  // 面内坐标 — 复用 vs 内已有相位变量自算（弧向 × 深度向），零新增数据：
  //   弧相位 = (ang-start)/sweep（防除零：退化扇段常量 0），径向/深度向见各分支
  let arcT = select(0.0, (ang - inst.start) / inst.sweep, abs(inst.sweep) > 1e-6);
  let dir = vec2f(cos(ang), sin(ang));
  var out: VOut;
  out.pos = camera.clipForTsukiyoWorld * vec4f(
    vec3f(inst.cx + dir.x * inst.rad * radial, inst.cy + dir.y * inst.rad * radial, z), 1.0);
  out.normal = nrm;
  out.color = vec4f(inst.r, inst.g, inst.b, inst.a);
  out.grad = z / (2.0 * inst.hz) + 0.5;   // 顶盖提亮渐变 — 俯视下 +Z 面向相机发光（饼图浮起感）
  // 骨架棱线距离场 — 分支语义：盖面 = 弧相位×径向（圆心+外缘两条弧骨架）；壁面 = 弧相位×深度相位
  if (vi < S6) {
    out.uv = vec2f(arcT, radial);
  } else if (vi < S6 + 12u) {
    // 平直侧壁（起始边/终止边各一 quad）— x = 深度相位（顶边↔底边），y = 径向相位（圆心边↔弧边）
    //   四棱（顶/底/圆心/弧）经 fs 距离场发亮 = 骨架壁面
    out.uv = vec2f(z / (2.0 * inst.hz) + 0.5, radial);
  } else {
    // 外弧壁 — x = 弧相位（起始↔终止），y = 深度相位（顶边↔底边）；四棱同样发亮
    out.uv = vec2f(arcT, z / (2.0 * inst.hz) + 0.5);
  }
  return out;
}
