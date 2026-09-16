// box — 盒体材料（消费 Rect / Line）
// 实例: [中心.xy, 旋转角, 半尺寸.xyz, 颜色.rgba] — 线 = 细长旋转盒，与柱共用管线
// 依赖 common.wgsl 的 Camera / VOut / camera 绑定（拼接后编译）

struct BoxInst {
  cx: f32,
  cy: f32,
  ang: f32,
  hx: f32,
  hy: f32,
  hz: f32,
  r: f32,
  g: f32,
  b: f32,
  a: f32,
};

@group(0) @binding(1) var<storage> boxInst: array<BoxInst>;

// 单位立方体几何表 — 6 面 × 4 顶点（pos∈[-1,1]³ 法线朝外），12 三角形
// var<private> 而非 const：运行时 vertex_index 索引 100% 保证合法
var<private> BOX_POS = array<vec3f, 24>(
  vec3f( 1.0, -1.0, -1.0), vec3f( 1.0,  1.0, -1.0), vec3f( 1.0,  1.0,  1.0), vec3f( 1.0, -1.0,  1.0),  // +X
  vec3f(-1.0, -1.0,  1.0), vec3f(-1.0,  1.0,  1.0), vec3f(-1.0,  1.0, -1.0), vec3f(-1.0, -1.0, -1.0),  // -X
  vec3f(-1.0,  1.0, -1.0), vec3f(-1.0,  1.0,  1.0), vec3f( 1.0,  1.0,  1.0), vec3f( 1.0,  1.0, -1.0),  // +Y
  vec3f(-1.0, -1.0,  1.0), vec3f(-1.0, -1.0, -1.0), vec3f( 1.0, -1.0, -1.0), vec3f( 1.0, -1.0,  1.0),  // -Y
  vec3f(-1.0, -1.0,  1.0), vec3f( 1.0, -1.0,  1.0), vec3f( 1.0,  1.0,  1.0), vec3f(-1.0,  1.0,  1.0),  // +Z
  vec3f(-1.0, -1.0, -1.0), vec3f(-1.0,  1.0, -1.0), vec3f( 1.0,  1.0, -1.0), vec3f( 1.0, -1.0, -1.0),  // -Z
);

var<private> BOX_NRM = array<vec3f, 24>(
  vec3f( 1.0, 0.0, 0.0), vec3f( 1.0, 0.0, 0.0), vec3f( 1.0, 0.0, 0.0), vec3f( 1.0, 0.0, 0.0),
  vec3f(-1.0, 0.0, 0.0), vec3f(-1.0, 0.0, 0.0), vec3f(-1.0, 0.0, 0.0), vec3f(-1.0, 0.0, 0.0),
  vec3f( 0.0, 1.0, 0.0), vec3f( 0.0, 1.0, 0.0), vec3f( 0.0, 1.0, 0.0), vec3f( 0.0, 1.0, 0.0),
  vec3f( 0.0, -1.0, 0.0), vec3f( 0.0, -1.0, 0.0), vec3f( 0.0, -1.0, 0.0), vec3f( 0.0, -1.0, 0.0),
  vec3f( 0.0, 0.0, 1.0), vec3f( 0.0, 0.0, 1.0), vec3f( 0.0, 0.0, 1.0), vec3f( 0.0, 0.0, 1.0),
  vec3f( 0.0, 0.0, -1.0), vec3f( 0.0, 0.0, -1.0), vec3f( 0.0, 0.0, -1.0), vec3f( 0.0, 0.0, -1.0),
);

var<private> BOX_IDX = array<u32, 36>(
  0u,  1u,  2u,   0u,  2u,  3u,
  4u,  5u,  6u,   4u,  6u,  7u,
  8u,  9u, 10u,   8u, 10u, 11u,
 12u, 13u, 14u,  12u, 14u, 15u,
 16u, 17u, 18u,  16u, 18u, 19u,
 20u, 21u, 22u,  20u, 22u, 23u,
);

// 面内坐标表 — 与 BOX_POS/BOX_NRM 同构并列的第 4 张静态表：每面 (0,0)(1,0)(1,1)(0,1) 环绕，
// BOX_UV/BOX_POS 每顶点对齐，fs 侧 min(uv,1-uv) 距离场即"到棱距离"→ 棱线骨架
var<private> BOX_UV = array<vec2f, 24>(
  vec2f(0.0, 0.0), vec2f(1.0, 0.0), vec2f(1.0, 1.0), vec2f(0.0, 1.0),  // +X
  vec2f(0.0, 0.0), vec2f(1.0, 0.0), vec2f(1.0, 1.0), vec2f(0.0, 1.0),  // -X
  vec2f(0.0, 0.0), vec2f(1.0, 0.0), vec2f(1.0, 1.0), vec2f(0.0, 1.0),  // +Y
  vec2f(0.0, 0.0), vec2f(1.0, 0.0), vec2f(1.0, 1.0), vec2f(0.0, 1.0),  // -Y
  vec2f(0.0, 0.0), vec2f(1.0, 0.0), vec2f(1.0, 1.0), vec2f(0.0, 1.0),  // +Z
  vec2f(0.0, 0.0), vec2f(1.0, 0.0), vec2f(1.0, 1.0), vec2f(0.0, 1.0),  // -Z
);

@vertex
fn vs_box(
  @builtin(vertex_index) vi: u32,
  @builtin(instance_index) ii: u32,
) -> VOut {
  let v = BOX_IDX[vi];
  let inst = boxInst[ii];
  let c = cos(inst.ang);
  let s = sin(inst.ang);
  let rot = mat2x2f(c, s, -s, c);
  let local = vec3f(rot * (BOX_POS[v].xy * vec2f(inst.hx, inst.hy)), BOX_POS[v].z * inst.hz);
  var out: VOut;
  out.pos = camera.clipForTsukiyoWorld * vec4f(vec3f(inst.cx, inst.cy, 0.0) + local, 1.0);
  out.normal = vec3f(rot * BOX_NRM[v].xy, BOX_NRM[v].z);
  out.color = vec4f(inst.r, inst.g, inst.b, inst.a);
  out.grad = local.y / (2.0 * inst.hy) + 0.5;   // 竖向能量渐变 — 顶亮底深（世界 Y = 屏幕向上）
  out.uv = BOX_UV[v];                            // 面内坐标 — 棱线骨架距离场
  return out;
}
