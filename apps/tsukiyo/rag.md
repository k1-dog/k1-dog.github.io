# tsukiyo（月读）RAG 知识库

> 链式可视化库：图表类型 = coord 规则 + point 映射的组合，不是独立类。
> 本文档为检索增强索引 — 按主题组织，每条含文件定位 + 关键词，供 AI 快速定位实现。

---

## 1. 总体架构

### 1.1 目录结构

```
apps/tsukiyo/
├── index.ts          # 根入口 — 全部公共导出
├── yomi.ts           # 类型契约层（読み）— 全局接口/类型集中地
├── world.md          # 用户文档（图表演示 + 用法）
├── rag.md            # 本文件 — AI 检索知识库
├── helper/           # ① 通用工具（与数据/视图/调度无关的普适能力）
│   ├── const.ts      # 全部常量（命名规范：场景前缀_含义）
│   ├── canvas.ts     # Hcvs_ Canvas 封装（retina/batch）
│   ├── maths.ts      # Hm_ 数学工具（rgba/palette/mapRange）
│   └── kit.ts        # Hs_ 通用工具（类型判断/UUID/深拷贝/Wish/Pool/Intake）
├── m/                # ② Model 数据层 — 图形背后的真实数据模型
│   ├── model.ts      # TsuModel — SoA 唯一数据源 + 统一读写出口（anim/hover/click 收口）+ vToM/mToV 桥
│   └── std.ts        # std() 数据标准化/初始化（宽表 melt → 长表 / 基元快路径）
├── v/                # ③ View 视图层 — 图形绘制与交互联动
│   ├── shape.ts      # Shapes 原语工厂 + pointTask（SoA 图形槽唯一写入者）
│   ├── coord.ts      # coordTask 定位 + resolveCoordLocator 规则解析（含投影挂 ctx）
│   ├── paths.ts      # pathsTask 非位置几何 + PathsHook
│   ├── layering.ts   # 高级视觉布局 — 视觉基准/脏区收集/剔除/anim 推进委托
│   ├── camera3.ts    # 取景相机 — CoordMapper 双实现 + 3D 相机数学
│   ├── render.ts     # Canvas2D 渲染器 + createRenderer（2D/3D 工厂）
│   ├── render-3d.ts  # WebGPU3D 渲染器（storage buffer 实例化）
│   ├── interact.ts   # 鼠标事件联动响应（hover/click/tooltip — 命中委托 spatial）
│   └── wgsl/         # WGSL 着色器（?raw 加载）+ wgsl.d.ts
└── middleware/       # ④ 中间件层 — 桥接 m↔v / 统领全局
    ├── scheduler.ts  # Scheduler — 唯一时钟（16ms lockstep）
    ├── engine.ts     # Engine — 装配全部 task 到 Scheduler（统领全局）
    ├── index.ts      # Tsukiyo 链式入口类（统领装配）
    ├── spatial.ts    # Grid — 空间三区（划分索引/聚合取景/命中检测，桥接 m↔v）
    └── dirty.ts      # Dirty — 脏区域收集合并（桥接 SoA 脏位图 → v 重绘区域）
```

### 1.2 核心 6 大工作执行流阶段（关系图 + 职责）

```
【投递入口 · 零 SoA 写入】
  data(raw,dim) / resize(w,h) ──暂存──▶ engine.pending ──▶ scheduler.reset('input')
  （调用线程只投递不落地 → 结构性消灭跨 tick「新值+旧形」混合态）
══════════ Scheduler 唯一时钟 · 16ms tick · 统一执行入口 ══════════

  ① input ──▶ ② point ──▶ ③ coord ──▶ ④ paths ──▶ ⑤ layering ──▶ ⑥ draw
  消费pending   写图形槽     写x/y+Ctx   写非位置几何  脏区/剔除/anim  纯读取上屏
  (reset重投)  (after ①)   (after ②)   (after ③)   (after ④)     (after ⑤·draw相)

  【外部事件旁路 · 非数据流阶段】
  DOM 事件 ──▶ Intake 缓冲 ──▶ interact（after ③ · 常驻）
                                ├─ 命中测试：射线/点拾取 + spatial 粗筛 + 几何精筛
                                ├─ 只写 hoverSlots / clickSlots（派生集合，不碰 SoA）
                                └─ markDirty ──▶ 回交 ⑤ 同 tick 消费（interact 先于 ⑤ 执行）
```

**阶段职责表**（SoA 写入权随阶段流转 — 每数组唯一写入者）：

| 阶段 | 实现 | 触发时机 | 消费（上游输入） | 产出（写入权） | 核心职责 |
|---|---|---|---|---|---|
| ① input | engine.ts | reset('input') 重投（done 后不重跑） | pending（raw/dim/resized） | 零 SoA 写；locator / gridDirty 信号 | std 标准化 → loadElements 暂存 → locator 重解析 → gridDirty 置位 |
| ② point | v/shape.ts | after ① · dataDirty 守卫 | elements + pointFn | type / fill / aux / src（图形槽唯一写入者） | 元素 → ShapeDesc → 连续写入 SoA；pointFn 可依赖元素数据，数据变化必须重定型 |
| ③ coord | v/coord.ts | after ② · dataDirty 守卫 | locator + 视口尺寸 | x / y（定位）+ CoordCtx（值域上下文） | 坐标定位 + 值域归一，产出 ④ 与网格共享的上下文 |
| ④ paths | v/paths.ts | after ③ · dataDirty 守卫 | locator + CoordCtx | w / h + aux（非位置几何） | 图形封闭（h/角度/Δ/偏移）+ pathsHook 用户边界；dataDirty 用后清除 |
| ⑤ layering | v/layering.ts | after ④ · 常驻 | gridDirty + drainDirty + 视口 | region / regionBigDrawing + spatial 更新（anim 推进委托 model.stepAnim） | 微流水：网格重绘 → 脏消费+AABB 扩张+spatial 更新 → region 合并 → inView 剔除 → anim 推进（model 出口） |
| ⑥ draw | v/render.ts · render-3d.ts | after ⑤ · draw 相 | region + inView + 相机矩阵/视线 | 零 SoA 写（纯读取） | Canvas2D 分桶批绘制 / WebGPU storage buffer 实例打包 → flush 上屏 |

**关键不变量**：
- **SoA 永不跨 tick 混合态** — data() 调用线程只暂存，tick 内 ①→④ 串行完成
- **input 是实体任务** — done 后不重跑，data()/resize() 通过 reset('input') 重投
- **grid 在 ⑤ 首行重绘** — after ④，此刻 coordCtx 必为本轮最新（结构性消灭 Y 轴刻度滞后）
- **interact 一帧滞后** — 消费上一帧 spatial 索引（⑤ 在其后更新），与渲染同一滞后节奏

### 1.3 调度契约（Scheduler 注册表视角）

> ①-⑥ 为数据主链（关系图与职责详见 1.2）；interact 为外部事件旁路。

| task | 触发 | 职责 |
|---|---|---|
| input | reset 重投 | std 标准化 + loadElements + locator 重解析 |
| point | after input | pointTask 写 SoA（x/y/type/fill/aux...唯一写入者） |
| coord | after point，dataDirty 守卫 | coordTask 写 x/y 定位 + 产出 CoordCtx |
| paths | after coord | pathsTask 写非位置几何（h/角度）+ pathsHook |
| interact | 常驻 after coord | hover/click 命中（一帧滞后用 spatial） |
| layering | 常驻 after paths | gridDirty 网格 + drainDirty + inView + anim 推进 |
| draw | 常驻 after layering（draw 相） | renderer.flush(region, inView) |

## 2. SoA 数据模型（m/model.ts）

### 2.1 数组清单

| 数组 | 含义 | 写入者 |
|---|---|---|
| x, y | 图表系中心坐标 | coord task |
| w, h | 半宽/半高（非全宽） | paths task |
| type | Prim 原语类型 | point task |
| fill | RGBA 打包 uint32 | point task（唯一） |
| aux | 几何参数（GEO_SLOTS_EACH_ELEM=3 槽/元素） | point/paths task |
| anim | 生长进度 0→1 | model 出口（stepAnim 推进 / setClickSlots 重置 — 唯一写入出口收口 model） |
| dirty | 脏位图（**单真相结构** — 无第二结构需同步） | markDirty 幂等置位 / drainDirty 扫描清零 |
| src | 原始元素索引 | point task |
| hoverSlots | hover 槽位集合（**派生态**，不写 SoA） | model 出口 setHoverSlots/clearHover（interact 唯一调用方） |
| clickSlots | click 锁定集合 | model 出口 setClickSlots/clearClick（interact 唯一调用方） |

### 2.2 关键协议

- **markDirty(i) / drainDirty()** — 位图单真相：markDirty 幂等置位（守卫只查物理边界，`dirty[i]=1` 直写同样合法）；drainDirty 是唯一消费者 — 扫描 0..count 收集 + 扫描后清位图（对任意写入方式闭合，复用 buffer 零分配）
- **dataDirty** — 数据链单标志驱动：input task 消费 pending 时单点置位（data/resize 分支同点）→ point/coord/paths 同 tick 守卫放行 → paths 尾部单点清除（与脏位图协议同构：一次置位、单点消费、零 reset 命令式级联）
- **锁定视觉（hover/click）** — 两类原语同一 strokeStr 高亮语义：填充原语（Rect/Circle/Arc/Triangle）= 本色填充 + 高亮色描边轮廓；描边原语（Line/Curve）= 整线换高亮色 + 加粗 STROKE_LOCKED。绘制时从 hoverSlots/clickSlots 派生（render.ts 内单点表达）
- **重绘契约（regionDrawing / regionBigDrawing）** — layering 产出的双参：regionDrawing = 本帧重绘域（脏元素 AABB 合并矩形，render clearRect + clip）；regionBigDrawing = 本帧重绘元素大名单（重绘域内脏元素 ∪ 域内相交非脏元素，联动补绘）。空闲帧双双为空 → draw 早退。seenEls（当前视线内全部可见元素集合）词已预订 — 出现真消费者（视口统计/legend 联动）时在 layering 顺手物化，现在不预创（无消费者不建通道）
- **设备域全清（残影根治）** — 旧帧像素活在旧变换位置，任何图表域 region 清除都够不着 → layering.wipeDevice（save/setTransform(1)/clearRect 物理画布/restore）在 gridDirty 分支（含视线 moved 帧）对 dataCanvas + gridCanvas 双清；稳定帧（hover/动画）transform 不变，region 局部清除本来就正确，零回归
- **跟手锚点缩放** — zoomBy(delta, ax, ay)：锚点（缺省画布中心）钉住不动，g' = a - (a-g)·(z'/z)；wheel 消息 pos 携带光标坐标，task 内逐条按各自锚点顺序应用（同 tick 多次滚轮各自跟手）
- **视线交互（滚轮推拉 + 拖拽绕转，全模式通用）** — wheel → `zoomBy(ΣΔ)`（2D 视图缩放因子 / 3D 取景距离 dolly）；drag（M9Drag1nWindow 差分）→ `orbitBy(Σdx, Σdy)`（2D 视线平移 gazeX/gazeY / 3D 偏航 turn + 俯仰 tilt 自由旋转）。视线状态归 CoordMapper 双实现唯一持有，interact 零 2D/3D 分支；视线变换打断过期 hover/click 锁定态 + markAllDirty 全景重投影
- **取景 frame()** — layering ① 每帧无条件重算（聚合内容盒 → 取景 → 矩阵），返回 moved（取景变了）→ gridDirty → 双 canvas 视觉基准重建（Hcvs_retina 尺寸基准 × 视线仿射一步合成；3D 16 元矩阵自动跳过 — 网格纯基准静止，与 3D 取景语义对称）
- **视线之外 outOfSight** — layering 两处视口剔除判定（2D 正仿射屏幕域换算，pan/zoom 后回视线元素正确恢复；3D 恒 false 保守放行，真剔除由 GPU 裁剪面完成）
- **命中逆仿射** — CoordMapper2D.worldToCoordXY = `(sx-gx)/z`（与 gazeM 正变换严格互逆，渲染与命中同源）；spatial 划分区桶存图表坐标，天然视线无关零改动
- **std(raw, dim?)** — scale 阶段标准器兼缺省测绘器：无 dim → 基元数组快路径（`[10,80]` → `{dimX:'index', dimY:'value'}`，固定缺省值由 std 自身实现，引擎不预填）；有 dim → 宽表 melt 长表。维度映射从产出元素派生（e.dimX/e.dimY 去重），零外部传参
- **hover/click 零 SoA 污染** — 高亮由 render/3D packer 绘制时从 hoverSlots 派生（描边+缩放），fill[] 唯一写入者是 point 阶段
- **vToM/mToV** — 槽位 ↔ 原始元素双向桥
- **aabbInto(i, buf) / aabb(i)** — 前者零分配（复用 buf），后者分配新数组；contentBounds() 聚合全量内容盒（单源）
- **dataDirty** — 数据结构性变化信号（input task 消费 pending 时置位，point/coord/paths 守卫放行，paths 消费后清除）

## 3. 视觉层（v/）

### 3.1 shape.ts — 原语工厂

`Shapes.rect(w, h, rgba)` / `Shapes.line(rgba)` / `Shapes.arc(r, start, end, rgba)` / `Shapes.triangle(dx1, dy1, dx2, dy2, rgba)` / `Shapes.text(str, size)` / `Shapes.curve(...)`。
pointTask 遍历元素调 pointFn 得 ShapeDesc，连续写入 SoA（fill 打包 uint32）。

### 3.2 coord.ts — 定位（轴原语组合）

- `Axis` — 轴原语组合子：坐标系 = 两根轴（域 kind + 投影 at）组装，非独立类
  - 切片：`catX`（分类列中心）/ `baseY`（基线）/ `polarX/polarY`（画布中心）/ `radarX/radarY`（角度+半径）
  - 数值轴：`x(fX?)` / `y(fY?)`（字段连续线性映射；缺省取 `el[el.dimX]` / `el.value`）
  - 组合子：`xy(fX?, fY?)`（散点 = 双数值连续轴，`init:{y0:false}` 真实值域）
- `resolveCoordLocator(rule, model, w, h)` — name/locator/fn → `ITsukiyoLocator`（解析 + 投影 + 挂 ctx 单点完成）；
  string 分支浅拷贝防多 Engine 共享污染；未知名称 warn + 回退 Bar
- `coordTask(model, locator, w, h)` — 写 x/y + 返回 CoordCtx（valueMin/valueMax + xMin/xMax 数值轴域）；
  `locator.init?.y0 !== false` 时 Y 域 0 基线 + 1.2 上扩（柱/线/雷达），`false` 用真实 min/max（散点）
- `radarRadius(w, h)` — 雷达半径（含标签位），grid 与 coord 同源
- 内置 preset：`Bar`/`Line`/`polar`/`radar` — 仅预制组合语法糖（builtin 查表），任意新图表 = 轴的自由组合

### 3.3 render.ts / render-3d.ts — 绘制+清理

- `createRenderer(canvas, mode)` — 工厂：2D → {renderer, camera:恒等}；3d → WebGPU3D + camera3 相机（回退 2D 同步降级）
- Canvas2D：Hcvs_batch 按原语类型分桶批渲染
- WebGPU3D：1 原语 = 1 Material = 1 storage buffer = 1 draw call；实例数据 10×f32=40B/个连续写

### 3.4 layering.ts — 高级视觉布局

task 五阶段：① 取景 spatial.frame（moved → gridDirty）+ 视觉基准重建（redrawGrid 按 locator.grid meta + 双 canvas retina 合成 + wipeDevice 设备域全清）② drainDirty 消费+AABB 扩张（DIRTY_PAD_RATIO×+DIRTY_PAD_PX）+ spatial.update ③ dirty.consume 合并 regionDrawing ④ regionBigDrawing 收集（视口∧脏区相交）⑤ anim 推进 — 委托 **model.stepAnim(regionBigDrawing)**（anim 唯一写入出口收口 model）。静态网格层 gridCanvas 与数据 canvas 分离（不闪烁）。

### 3.5 interact.ts — 鼠标事件联动

事件接收派发器（零几何感知）：DOM 事件 → Intake → task drain；leave 清 hover/click（委托 model.clearHover/clearClick）；wheel/drag → spatial.zoomBy/orbitBy + markAllDirty；move/click → **`spatial.onHitTest(m, sx, sy)` 单出口委托**（null=无法检测保持现状态 / []=无命中照常清 hover）→ setHover/setClick（**委托 model 出口 setHoverSlots/setClickSlots** — anim/hover/click 写入单点收口）。tooltip 常量 TOOLTIP 配置（cssText/offset/valueDecimals）。

### 3.6 camera3.ts

- `frameCamera(box, w, h, tilt, turn, zoom)` — 取景（包围球+有效视锥角；视线姿态 tilt/turn/zoom）
- `clipForTsukiyoWorld(cam)` — 视图×透视矩阵（三缓冲复用零分配）
- `toWorldSpace(box, halfZ)` — 图表 AABB → 世界盒（Y 翻转 + ±挤出半厚；spatial 命中区谓词消费的唯一共享出口）
- `sightRay` — 屏幕像素 → 世界系视线射线（模块私有；与透视矩阵严格互逆）
- ray* 命中谓词族（rayBox/rayBar/rayWedge）已收敛至 spatial 命中区

## 4. 中间件层（middleware/）— 桥接 m↔v / 统领全局

### 4.1 scheduler.ts

唯一时钟 rAF 16ms tick，两相执行：logicQ（task 函数）→ drawQ（phase:'draw'）。after 依赖按 executed 集判完成；reset(name) 重置 done 触发重跑；complete(name) 手动标记完成。Intake 摄入口 — 外部事件缓冲到 tick 内消费。

### 4.2 spatial.ts — Grid（三区治理）

- **划分区**（cell=DEFAULT_CELL_SIZE 空间哈希）：insert 覆盖分桶 / remove 精确撤桶 / update 换桶 / queryPoint 粗筛 3×3 邻域（只存 slot 数字）
- **聚合区**（取景相机）：camera（CoordMapper 策略构造注入，与渲染后端成对）；spatial.frame 每帧取景 → cameraMatrix/cameraSight/pickRay/worldToCoordXY 转发；命中射线与渲染矩阵同一次取景产出（三方同源）
- **命中区**（碰撞检测单出口）：`onHitTest(m, sx, sy)` 唯一入口 — 射线就绪走 hitByRay（z 板夹取 → 划分区候选 → rayBody 逐槽位精测），否则 hitByPoint（worldToCoordXY → 候选 → AABB/Arc 角度/Triangle 重心内联精筛）；null=无法检测 / []=无命中语义区分；纯读零写
- ray* 谓词族（模块级纯函数，凸域相交统一"t 区间收窄"）：rayBox（Rect 盒）/ rayBar（Line 条）/ rayWedge（Arc 楔，|sweep|≥π 退化整圆盘）/ rayBody（逐槽位分派，几何参数逐字镜像 render-3d packer）

### 4.3 engine.ts — 统领装配

装配层零逻辑。pending 投递通道（raw/dim/resized）；registerTasks 注册 ①-⑦；pause/resume 幂等管理 interact/layering。

### 4.4 index.ts — Tsukiyo 链式入口（统领）

`new Tsukiyo(canvas).input().scale().coord().point().paths().draw(mode)` 链式组合；draw 内 createRenderer 与 Engine 成对装配（回退 2D 时相机同步降级恒等）。

## 5. 常量速查（helper/const.ts）

| 常量 | 值/含义 |
|---|---|
| TAU | 2π（全角度弧度量） |
| GEO_SLOTS_EACH_ELEM | 3（aux 每元素槽数） |
| STROKE_NORMAL / STROKE_LOCKED | 2 / 4（常态/hover 描边宽，比值 2× 用于 3D 同比） |
| HOVER_SCALE | 1.05（hover 缩放比） |
| HALF_EXTRUDE_Z | C3D.THICK_BAR/2（挤出半厚单源） |
| ANIM_STEP | 每帧生长推进量 |
| DIRTY_PAD_RATIO / DIRTY_PAD_PX | 脏区扩张（比例+像素） |
| TEXT_DEFAULT_SIZE | 14（text 默认字号） |
| GRID_STYLE | 网格样式（stroke/lineWidth/labelFont/offsets） |
| AXIS_TICKS / RADAR_GRID_LAYERS / POLAR_GRID_RAYS | 轴刻度数/雷达层数/极坐标辐射线 |
| ARC_START_ANGLE | -π/2（雷达顶部起点） |
| DEFAULT_CELL_SIZE | spatial 哈希格子 |
| TOOLTIP | tooltip DOM 配置 |
| C3D | 3D 场景族常量（LIGHT/AMBIENT/NEON_*/THICK_*） |
| GPU | GPU 配置族（USAGE_*/MSAA_SAMPLES/BOX_VERTS/GROUND_VERTS/SCENE_UNIFORM_FLOATS） |
| CURVE_NORMAL_RATIO / STROKE_NORMAL 等 | 曲线/描边 |

命名规范：`场景前缀_含义`（C3D_ 3D 场景、GPU_ 渲染配置、TOOLTIP 交互）；数学不变量大写；魔法数字禁止散布（如 π×2 必须 TAU、C3D.THICK_BAR/2 必须 HALF_EXTRUDE_Z）。

## 6. 八大设计准则（！！非常重要！！）

> 全库设计铁律 — 任何修改前逐条对照自检。每条附「落地锚点」指向本库已实践的位置。

1. **逻辑变量能派生复用就派生复用、避免定义冗余新概念**
   落地锚点：hover 高亮 = hoverSlots 派生态（render/3D packer 绘制时派生描边+缩放）；3D hover 加粗 = STROKE_LOCKED/STROKE_NORMAL 比值派生；HALF_EXTRUDE_Z = C3D.THICK_BAR/2 单源；camera3/render-3d 聚合盒复用 model.contentBounds()。

2. **变量或者方法的命名，风格一定要简洁、优雅、同时不能缺失具体语义**
   落地锚点：hoverSlots（命中的是 SoA 槽位而非原始元素）；resolveCoordLocator（实际产出定位器）；形参 $ 前缀 / 局部 _ 前缀既定约定。

3. **数据状态的同步写入更新方面，严禁出现多处相同链路数据的同步，避免数据值漂移，对齐困难**
   落地锚点：gridDirty 由 layering task 首行消费（读到的 coordCtx 必为本轮产出，单点消费零同步）；hoverSlots/clickSlots 单源持有于 model，interact 零副本。

4. **数据流上下游流向显式的清晰可见。并且数据源唯一是SoA存储结构，其他执行模块内的数据状态理论上都应该由SoA数组派生推导出来，不能单独持有其他数据源**
   落地锚点：engine registerTasks after 链显式声明 ①→⑥ 上下游；layering 依赖（视口/locator/coordCtx）全 getter 回调注入（读取即最新，零副本）；SoA 每数组唯一写入者（见 1.2 职责表）；hoverSlots/clickSlots 是外部输入态（不可由 SoA 派生），单点持有于 model、绘制时消费。

5. **核心执行工作流各阶段间逻辑要高内聚不发散，各核心逻辑的触发时机统一由scheduler时钟机调度执行，统一执行入口，方便管理各种执行逻辑的时序并发问题**
   落地锚点：engine 瘦身为纯调度装配层（零内联布局/绘制逻辑）；网格重绘、相机重算、anim 推进全部收编 layering task；interact 的 DOM 事件经 Intake 缓冲进 task 统一消费；draw 独占 drawQ 相（logic 全推完才绘制）。

6. **严格把控工作流各阶段的时序并发性，同时做好大数据性能防护手段**
   落地锚点：投递语义 — data()/resize() 调用线程零 SoA 写，tick 内串行落地；interact 一帧滞后（消费上一帧 spatial 索引，与渲染同节奏）。性能防护：aabbInto(buf)/矩阵三缓冲/uniformData/staging 零分配热路径；spatial 粗筛 → AABB → 几何精筛三级命中；视椎剔除 + 脏区域局部重绘。

7. **常量配置尽量应提尽提，避免硬编码魔法数字或魔法字符变量**
   落地锚点：helper/const.ts 全收编 — TAU（取代 Math.PI*2 散布）、GEO_SLOTS_EACH_ELEM（取代 slot*3）、GPU.USAGE_*/MSAA_SAMPLES/BOX_VERTS、TOOLTIP、GRID_STYLE、DIRTY_PAD_RATIO/PX；命名规范：场景前缀_含义。

8. **各个核心工作流阶段内，尽量不要单独持有临时存储数据去跨方法透传，应该将目标方法改为回调参数作为形式参数去使用**
   落地锚点：interact.lastPos 成员跨方法透传 → showTooltip($slot, $pos) 形参化；layering 的视口/locator/coordCtx 成员 → LayeringDeps getter 回调注入（依赖以回调形式作形参）。

### 6.1 工程备忘（非准则 — 修改操作清单）

- **改 SoA 结构**（增删数组/改槽位布局）：同步 model.ts + shape.ts（写入）+ render.ts/render-3d.ts（读取）+ camera3.ts（3D 几何）+ interact.ts（命中）
- **3D 几何参数**：render-3d.ts packer 与 spatial rayBody 逐字镜像（锚点语义：Rect 底部锚点生长/hover 底部中心缩放、Line 起点锚点延伸/hover 加粗 2×、Arc 半径生长/hover 半径缩放）；SECTOR_VERTS 与 vs_sector 的 vi 分解一一对应
- **改数据流顺序**：engine.ts registerTasks after 链；注意 interact 一帧滞后设计
- **改导出名**：同步根 index.ts 与 middleware/index.ts（链式入口）
- **改网格**：layering.ts redrawGrid + GRID_STYLE，网格族判定读 locator.grid（单源）
- **零分配热路径**：aabbInto(buf)/矩阵三缓冲/uniformData/staging 修改时保持复用模式

## 7. 已知边界（v1）

- 3D 支持原语：Rect/Line/Arc；Text/Curve/Triangle/Circle 静默跳过
- 3D 不开混合 — fill alpha 忽略
- 3D 命中沿用 2D spatial 划分区粗筛 + 射线精测（透视下 hover 有轻微偏差）
- engine 无 teardown — device.lost 短路 flush
- interact 一帧滞后（消费上一帧 spatial 索引，设计取舍）

## 8. 快速定位表

| 想改什么 | 去哪 |
|---|---|
| 图表类型/坐标规则 | v/coord.ts Axis 组合子 + resolveCoordLocator |
| 元素→图形映射 | v/shape.ts Shapes + 用户 pointFn |
| 颜色 | helper/maths.ts Hm_palette |
| hover 高亮样式 | v/render.ts drawBatch（STROKE_LOCKED）+ render-3d.ts（hover 派生） |
| tooltip 样式 | helper/const.ts TOOLTIP + interact.ts showTooltip |
| 网格背景 | v/layering.ts redrawGrid |
| 动画速度 | helper/const.ts ANIM_STEP |
| 3D 视角/光照 | helper/const.ts C3D + v/camera3.ts |
| 脏区域/局部重绘 | middleware/dirty.ts + v/layering.ts task |
| 命中测试 | middleware/spatial.ts 命中区（onHitTest 单出口；v/interact.ts 委托） |
| anim/hover/click 写入 | m/model.ts 出口（stepAnim/setHoverSlots/clearHover/setClickSlots/clearClick） |
| 调度顺序 | middleware/engine.ts registerTasks |
