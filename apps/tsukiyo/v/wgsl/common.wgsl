// common — 共享材质基础（相机 + 光照 + 霓虹玻璃，全部材料复用）
// 纯静态零插值：光照/霓虹参数经 Camera uniform 每帧由 TS 侧写入（render-3d.ts）

struct Camera {
  clipForTsukiyoWorld: mat4x4f,   // world → 裁剪+透视除法 → 屏幕月读世界
  lightDir: vec4f,   // xyz = 平行光方向（未归一化，fs 内归一化）, w = 环境光占比
  viewRim: vec4f,    // xyz = 视线方向（相机光轴，TS 侧每帧随滚轮俯仰产出）, w = 菲涅尔边缘光强度
  neon: vec4f,       // xyz = 霓虹基色（冰青）, w = 冷色化混合比
  ground: vec4f,     // 发光地台四至 — 世界系 x0,y0,x1,y1（柱群包围盒外扩，layGround 每全量帧写）
};

struct VOut {
  @builtin(position) pos: vec4f,
  @location(0) normal: vec3f,
  @location(1) @interpolate(flat) color: vec4f,
  @location(2) grad: f32,         // 渐变系数 0~1 — 各材料 vs 自算（盒=竖向能量 / 扇段=顶盖提亮）
  @location(3) uv: vec2f,         // 面内坐标 0~1 — 各材料 vs 自算（骨架棱线的距离场）
};

@group(0) @binding(0) var<uniform> camera: Camera;

// fs_glass — 霓虹玻璃（智慧楼宇大屏观感：冷色化 + 能量渐变 + 边缘辉光 + 高光，叠加混合发光）
// 视向近似 = 相机光轴（viewRim.xyz）：场景尺度小、边缘视差角视觉无感，免传逐像素世界坐标
@fragment
fn fs_glass(in: VOut) -> @location(0) vec4f {
  let n = normalize(in.normal);
  let l = normalize(camera.lightDir.xyz);
  let v = normalize(camera.viewRim.xyz);
  let ambient = camera.lightDir.w;
  let rimI = camera.viewRim.w;
  let neon = camera.neon.xyz;
  let tint = camera.neon.w;

  // ① 基色冷色化 — 原色向冰青收敛（统一色系 = 大屏"柔和"感的来源）
  var rgb = mix(in.color.rgb, neon, tint);

  // ② 漫反射 + 视线补光 3:1 — 背光不死黑；× 能量渐变 — 顶亮底深（柱）/ 顶盖提亮（扇）
  let diff = max(dot(n, l), 0.0);
  let fill = max(dot(n, v), 0.0);
  let lit = ambient + (1.0 - ambient) * (diff * 0.75 + fill * 0.25);
  rgb *= lit * (0.65 + 0.5 * in.grad);

  // ③ 骨架棱线 — 面内到棱的距离场：min(uv,1-uv) 逐轴取最近棱 → smoothstep 过渡（宽 0.08）
  //    骨架外壳 + 内部全透的核心：面心近透明，12 条棱发亮
  let dEdge = min(in.uv, vec2f(1.0) - in.uv);
  let frame = 1.0 - smoothstep(0.0, 0.08, min(dEdge.x, dEdge.y));

  // ④ 菲涅尔边缘 — 掠射角反射率升高；pow3 = 柔和过渡带（棱线接棒主导轮廓）
  let rim = pow(1.0 - abs(dot(n, v)), 3.0) * rimI;
  rgb += neon * (rim + frame);

  // ⑤ Blinn-Phong 高光 — pow48 紧致光泽点；强度随边缘反射率同源派生
  let h = normalize(l + v);
  rgb += pow(max(dot(n, h), 0.0), 48.0) * 0.5 * (rim + frame);

  // alpha：面心近全透（ALPHA_MUL 0.12）+ 棱线渐实 = 骨架外壳；内部空间留给细节图形
  let alpha = in.color.a + (1.0 - in.color.a) * max(rim, frame);
  return vec4f(rgb, alpha);
}
