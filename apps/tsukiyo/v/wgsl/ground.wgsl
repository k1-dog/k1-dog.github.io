// ground — 发光地台（数字孪生的地面：柱群立于其上，楼宇大屏的空间参照）
//
// 单实例固定 quad — 非 SoA 打包：四至经 Camera.ground uniform 下发（零 storage buffer），
// 网格距离场在 fs 内程序化生成（fract 周期）。
// 材质语义（复用 common.wgsl 的 VOut）:
//   uv   = 世界系 XY — 网格距离场的度量空间（与棱线骨架的"面内度量"同构）
//   grad = 径向淡出 — 地台边缘渐隐（vs 内从 quad 中心距离派生，fs 调制辉光）

override GROUND_Z: f32 = 0.0;     // 地台高度 — 柱底焊接面（-THICK_BAR/2，pipeline 注入）
override GROUND_CELL: f32 = 40.0; // 地台格距（世界系 px — 网格距离场周期）
override GROUND_GLOW: f32 = 0.5;  // 地台辉光强度

/** 地台 quad 顶点 — 两三角形六个顶点（XZ 平面展开，中心为原点 ±0.5 归一坐标） */
var<private> GROUND_POS = array<vec2f, 6>(
  vec2f(-0.5, -0.5), vec2f(0.5, -0.5), vec2f(0.5, 0.5),
  vec2f(-0.5, -0.5), vec2f(0.5, 0.5), vec2f(-0.5, 0.5),
);

@vertex
fn vs_ground(@builtin(vertex_index) vi: u32) -> VOut {
  let p = GROUND_POS[vi];
  // 四至展开 — 归一坐标 → 世界系 XY（camera.ground = x0,y0,x1,y1）
  let wx = mix(camera.ground.x, camera.ground.z, p.x + 0.5);
  let wy = mix(camera.ground.y, camera.ground.w, p.y + 0.5);
  var out: VOut;
  out.pos = camera.clipForTsukiyoWorld * vec4f(wx, wy, GROUND_Z, 1.0);
  out.normal = vec3f(0.0, 0.0, 1.0);            // 地台朝上（俯视主见面）
  out.color = vec4f(camera.neon.xyz, 1.0);      // 霓虹基色 — 地台与楼宇同一色系
  out.grad = 1.0 - 2.0 * max(abs(p.x), abs(p.y)); // 径向淡出 — 中心 1 → 边缘 0
  out.uv = vec2f(wx, wy);                        // 世界系 XY — 网格距离场
  return out;
}

// fs_ground — 网格距离场：fract(xy/CELL) 的双向锯齿 → 棱线发光 × 径向淡出 × 霓虹
// （独立于 fs_glass — 地台是发光地面而非玻璃骨架，光照模型不同）
@fragment
fn fs_ground(in: VOut) -> @location(0) vec4f {
  // 双向锯齿距离 — 1 在格线处 / 0 在格心 → smoothstep 直接接格线（阈值 0.85 = 线宽占周期 15%）
  let g = abs(fract(in.uv / GROUND_CELL) - 0.5) * 2.0;
  let line = smoothstep(0.85, 1.0, max(g.x, g.y));
  // 径向淡出（grad）× 辉光强度 — 叠加混合下发亮，无遮挡语义
  let rgb = in.color.rgb * line * in.grad * GROUND_GLOW;
  return vec4f(rgb, 1.0);
}
