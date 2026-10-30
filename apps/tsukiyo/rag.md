# tsukiyo（月读）知识库

> **tsukiyo 月读** —— 「最终梦幻世界」：即使身处虚假世界 也享受其中 不想脱离
> tsukiyo 可视化 = 可视化任意数据描述 形成一个绝对自由美妙的可视化世界
>
> **设计哲学**：摒弃按图表类型的声明式配置绘制 命令式链式调用优先 图形语法驱动
> 由核心引擎七大阶段协调组装出各类图表 **严禁按图表类型生成分支逻辑**：
> 图表类型 = coord 规则 + shape 映射的组合 永远不是独立类

---

## 1. 总架构

### 1.1 目录四层

```
apps/tsukiyo/
├── index.ts / yomi.ts   根导出 / 类型契约（全部类型集中于此 type-only 零循环）
├── helper/              const 常量 · canvas 画布视觉 · maths 计算 · kit 摄入缓冲
├── m/                   model.ts SoA 唯一数据源 · std.ts 归一化 · scale.ts 尺度测绘
├── v/                   shape 图元 · coord 投影 · paths 几何 · anim 生长 ·
│                        layering 打包 · grid 网格 · camera3 相机 ·
│                        render / render-3d 后端 · interact 交互 ·
│                        evolve 演化暂存域 · toolbar 工具栏
└── middleware/          scheduler 时钟 · engine 装配 · index 链式入口 ·
                         spatial 空间 · dirty 脏域
```

### 1.2 七阶段流水

```
投递 data()/resize() ──暂存──▶ Scheduler tick（16ms lockstep 逻辑相→绘制相）

frame ─▶ ①input ─▶ ②scale ─▶ ③shape ─▶ ④coord ─▶ ⑤paths ─▶ ⑥layering ─▶ ⑦draw
钩子     std归一    维度划分   图元定型   锚点定位   几何+链路   脏域+剔除   flush+生长
         elements   CoordCtx  SoA槽     locator   FillRoad   RenderBatch 像素

⑥interact 常驻（消费上一帧空间索引）
按需驱动：静止自停 · feed/data/resize/回视口 wake · 离屏 park · 脱离DOM/destroy stop
```

| 阶段 | 实现 | 职责 | 产物 |
|---|---|---|---|
| frame | engine | 每帧生产者钩子 + 脱离 DOM 永停守卫 | — |
| input | engine | 消费信箱 + std 归一 | elements |
| scale | m/scale.ts | dim 索引 + nx/ny/nr 展开 + 值域统计 | CoordCtx |
| shape | v/shape.ts | 图元→图形槽（SoA 唯一写入者）+ 换代号 | CoordCtx 透传 |
| coord | v/coord.ts | 纯投影（零域扫描 零标脏） | locator |
| paths | v/paths.ts | grow 求尺寸 + Pen 重建路径 + 链路封闭 | FillRoad |
| layering | v/layering.ts | 取景 + 脏域收拢 + 剔除 + 子层编排 | RenderBatch |
| draw | v/render*.ts | flush + 状态推送 + 生长推进（推进则 wake 补一拍） | true |

**产物交棒（唯一依赖机制）**：`step` 返回值即产物 本 tick 内 `after` 声明的上游产物按声明序注入形参
上游未产出→本帧不执行 阶段产物绝不落 engine 字段

**关键不变量**：SoA 永不跨 tick 混合态（逻辑相后绘制相）；每数组唯一写入者；
阶段不越界（shape 不定位 coord 不标脏 paths 不碰空间 layering 不绘制）；
画布视觉（尺寸/层级/变换）唯一应用点 `Hcvs_retina`

---

## 2. SoA 数据模型（m/model.ts）

| 数组 | 含义 | 唯一写入者 |
|---|---|---|
| src / dimX / dimY / value / id / fill | 槽位→元素下标 / 维度索引 / 值 / 形状序号 / packed RGBA | shape |
| w / h | 定型宽高（shape）+ 目标几何 Δ（paths） | shape · paths |
| aux | 几何参数（5 槽/元素 按 spec.slots 声明序） | shape · paths |
| x / y | 锚点坐标 | coord |
| paths / subs / bounds | 主路径 / 子图形 / 局部包围盒（派生缓存 一代一建） | paths |
| anim | 生长进度 0→1（负值=入场等待） | anim grow/reset + interact 锁定 |
| hoverSlots / clickSlots | 交互锁定集合 | interact |
| gen | 数据换代号 | shape +1 |

**协议**：aux 槽位由形状自己声明（无全局表 缺失写 NaN）；`Shapes.custom(spec)` 返回工厂闭包
（无全局注册表 内置形状同一路径构建）；nx/ny/nr 相对声明随视口重放；`__ri` 原始行号由 std
写入（evolve 反解回链 raw 行的唯一环节）

---

## 3. 阶段要点

### shape（v/shape.ts）
- 一个形状 = 一个 `ShapeSpec`（九字段封顶：slots/geo/grow/tween/fill/lineWidth/dash/λDelay/three/kind）
- `geo(e, pen)` 原生 Path2D 签名写局部几何 返回值可替代主路径 `pen.add()` 追加可命中子图形
- `Grow.y / Grow.r` 是函数常量：值→局部尺寸（h / r）像素换算唯一在此完成 要第三种直接写函数
- 只写定型几何（柱宽/半径/文案）不写位置；每槽复位 w/h/aux + gen++ + anim = -λDelay

### scale + coord（m/scale.ts / v/coord.ts）
- scale：维度划分 + 值域统计（v0/v1/vΣ + x0/x1）纯扫描 产物即 CoordCtx
- coord：逐槽投影 `x/y = proj(el, ctx, iX, iY)` + 锚点归一 零其他职责
- `Axis` 纯函数族（band/v/x/angle/rad）+ `Radar` 成对常量；`Axis.band` 零配置分组
  （(iX + 子列偏移)/dX·w 多组柱自动等分子列）；`Band.even/w(ws)/polar` 非均匀间距
- `resolveLocator(rule)` 三分支归一（string / locator / 工厂）浅拷贝防共享污染

### paths（v/paths.ts）
- ① `spec.grow(value, box)` 值→尺寸（弧角度占位按 value 切分）
- ② `spec.geo(box, pen)` 一调用得主路径+包围盒+子图形 写入派生缓存
- ③ 链路封闭 `RoadRule { loop, step, by, fill }`（四字段封顶）或 RoadFn；
  `seriesRing` 一趟同系列映射 `buildRoad` 链头先走+纯环后走 `fill` 声明即启用填充
- ChainPen 记录型画笔链（Storm 雨幕封闭填充用它）

### anim（v/anim.ts）
- `grow(model, dirty)` 扫全部 anim<1 槽推进+标脏续播（不依赖 bigArea 被剔除槽也能完成）
  返回是否推进 draw 据此 wake 补末帧 flush（末拍标脏发生在 layering drain 之后）
- 负值=入场等待 reset 写 anim=-λ 天然把「负→0→1」推过去 多段时序零新增字段
- **grow 与 tween 两件事**：grow 值→盒（paths 一次定型）tween 进度→盒（draw 逐帧重跑 geo）
  circle/ring/arc/line/curve 不应声明 grow（圆变同心圆 饼变玫瑰）

### layering（v/layering.ts）
- ①取景（contentArea→camera.frame moved 则 markFull `Hcvs_retina` 单循环施全画布）
  ②变更收拢（drain 逐槽旧位+新位并入 被剔除重入队 退役槽删空间记录）
  ③Λ折叠（无变更不产出=空转闸）④大域单遍单谓词（先剔除再测域）
- 子层=同构 Layer 记录（engine 或 paint 二取一）grid 是一等子层；host-glued 层随宿主尺寸

### draw（v/render.ts / render-3d.ts）
- flush：clearRect（**设备空间** save→setTransform(1,0,0,1,0,0)→clear→restore 缩放下清屏残留的根因）
  + underlay 填充（同域裁剪）+ 连续 run 批绘（相邻同 id 合并 数据序=绘制序=z序）
- 文本单源 `el.text ?? el.value`；颜色按 packed 值 memo；hover 用 translate+scale 包裹不重建
- 3D：Rect/Line/Arc 挤出 相机矩阵与命中射线同源 `createRenderer` 是相机唯一创建处

### interact + camera3（v/interact.ts / v/camera3.ts）
- DOM 事件→Intake 缓冲→tick 内 drain（16ms 合天然节流）；视线变化驱动相机+全槽标脏
- 命中委托 `space.hitTest`：2D isPointInPath 局部系测试（零每帧分配）/ 3D 射线流
- `frame(aabb,w,h,initZoom)` 返回 moved；`view { m, sight, area }` 渲染与命中同源

### mugen（v/mugen.ts）— 无限月读天幕
- `drawMugen(ctx, w, h)` 一个 paint 一张天幕：写轮眼之月（左上）+ 地平线（底部）+
  斑剪影立绘（右下 侧身五组路径——后发 甲胄 面部 前发 细节刻线）；屏幕锚定（paint 内回 CSS 屏幕系）纯视口比例 零数据耦合
- 用法 `{ z: -1, paint: drawMugen }`；静止零开销（paint 仅建层/moved 时调用）

---

## 4. 演化模式（v/evolve.ts + v/toolbar.ts）

**纯 DOM 手势沙箱 + 暂存区 不在 tick 流水线内**：

- **暂存语义**：mouseup 只是暂存点——幽灵副本演化成目标样子放到对应位置/尺寸 绝不写 SoA/raw
  唯一写出口 = 确认条 ✓（`confirm()` → `host.commit(stagedRaw())` → `engine.data()` 重投递 + 版本入栈）
  ✗ 丢弃 / 退出演化 / 外部 data() → discard 画布从未变过
- **暂存数据**：`stagedOrder`（组键目标序）+ `stagedEdits`（按 `__ri` 键的值编辑）唯一源
  `stagedRaw()` 纯派生 = 重排 + 逐行套编辑 多手势叠加自然正确
- **幽灵驻留**：`Map<__ri, ghost>`（pointer-events:auto 自带手势）；调序幽灵落插入位中点
  锁定幽灵保持新尺寸 可再抓取
- **手势**：点击（位移<3px）锁定形状→幽灵+蓝虚线框；锁定幽灵边缘 8px 分区拉伸
  （四边+四角定方向 对侧锚定 拉伸幽灵包围盒 规则/不规则同一机制）；拖拽调序
  （插入式 同 dimX 分组整体搬移 极坐标 arc 族按角度带排序 圆心射线指示）
- **值反演三通道 全部由引擎正向映射派生 evolve.ts 零平行公式**：
  ① 值通道 = grow 钩子回放（value±ε 喂回同一份 grow 写了哪个键即值属维度：
     Grow.y→柱高 Grow.r→半径斜率 观察量对斜率最小二乘 方向无关）
  ② 极坐标通道 = hub 投影分解：径向 v′=v+dr/r′（r′=grow 回放斜率 玫瑰径向=值）
     切向判据值切分一致性 |band−value/vΣ·TAU|<ε 代数求逆 v′=β′·rest/(TAU−β′)（饼图占比）
  ③ 锚点通道 = coord 投影微分（value±ε 喂回同一份投影得切向量 观察量=锚点位移）
     v′=v+Δa·û/|û|²（雷达/散点/折线顶点 任意自定义投影免费获得）
- **版本栈**：进演化模式记 v0（bind 截图）；confirm/回滚各追加；`snap` 缩略图挂起
  （pendingSnap）→ engine 推送 done 时截图（画布已定格）；回滚=discard+commit 追加回滚条目
- 边界：3D 相机不支持；重复值基元数组合并整体搬移；`ShapeSpec.resize` / `row.__evo` 已移除
  （slots 反解通道不存在 引擎内部派生尺寸不随拉伸变化 shapeFn 不感知演化态）

**工具栏**（v/toolbar.ts）：右侧竖排按钮（演化开关/状态卡四色点/收起）+ 演化模式的版本历史；
状态由 `engine.onStatus` push-on-change（绝不轮询）；确认条由 `onStaged` push 刷新；
版本行 hover → snap 缩略 canvas 预览卡

---

## 5. 中间件

- **scheduler** — 唯一时钟：`add(name, step, { after, phase, always })` 产物交棒；
  `intake` 统一缓冲；`addKeepAlive(name, probe)` 保活探针（生长中/帧钩子）tick 末全假且无
  pending→自停；tick 中段 wake 已订帧优先于自停；`onState(cb)` 在 start/stop/park/wake/自停
  五个跃迁点推送（工具栏状态源头）
- **engine** — 七阶段装配 + 投递信箱 `{raw,dim,fresh}` + 视口守卫（IntersectionObserver
  离屏 park/回视口 wake 仅主层）+ frame 脱离 DOM 永停；scale 由 dataGen/viewGen 布防；
  `data()` 丢弃演化暂存；四态 `get status`（paused/idle/growing/done）push-on-change；
  `stop()` 全拆
- **spatial** — `boxInto`/`contentArea` AABB 派生单源 + `TsuSpace` 哈希网格（撤桶由旧位反算
  格区间 无反向索引表）；`hitTest` 粗筛→精筛→排序
- **dirty** — 符号即定义：δ 槽位位图 / Α·ΑΔ 区域集按代轮转 / full 全域 / `Λ()` 折叠本帧
  重绘域（full 时 null=整屏）；旧位/旧像素/旧填充统一由这一条机制清除

---

## 6. 七大设计准则（铁律）

1. **派生复用** — 能派生就派生 单源定义 禁止冗余新概念
2. **简洁优雅命名** — 短而有场景语义（Δi/x0/vΣ/boxInto）`$` 形参前缀 `_` 局部前缀
3. **单点写入** — 每 SoA 数组唯一写入者 脏域只在 Dirty 画布视觉只在 Hcvs_retina
4. **数据流显式** — after + 产物形参 SoA 唯一真源 其余由 SoA 派生
5. **统一调度入口** — 核心逻辑经 Scheduler 外部每帧走 engine.onFrame 投递只暂存 tick 内落地
6. **时序与大数据防护** — 投递零 SoA 写 热路径零分配（复用缓冲/分桶/memo）粗筛+精筛 局部重绘
7. **常量应提尽提** — 集中 const.ts 场景前缀（Hm_/Hcvs_/Hs_）禁止魔法值散布

---

## 7. 快速定位

| 想改什么 | 去哪 |
|---|---|
| 坐标规则 / 图表类型 | v/coord.ts `Axis` + `resolveLocator` |
| 元素→图形映射 / 新形状 | v/shape.ts `Shapes.custom` |
| 归一化 / 数据声明展开 | m/std.ts + m/scale.ts |
| 闭合链 / 填充 | v/paths.ts `RoadRule` + `buildRoad` |
| 网格背景 | v/grid.ts（paint 子层） |
| 脏域 / 残影 | middleware/dirty.ts + v/layering.ts |
| 子分层 / 装饰层 | v/layering.ts（`LayerConf`） |
| 画布尺寸 / 层级 / 变换 | helper/canvas.ts `Hcvs_retina` |
| 初始缩放 | camera3 `frame(…, initZoom)` |
| 生长动画 | v/anim.ts + const `ANIM_STEP` |
| 命中测试 | middleware/spatial.ts `hitTest` |
| 调度顺序 / 交棒 | middleware/engine.ts `registerStages` |
| 外部每帧驱动 | engine.onFrame |
| 演化手势 / 版本回滚 | v/evolve.ts + v/toolbar.ts |
| 无限月读天幕 | v/mugen.ts `drawMugen`（paint 自绘层） |
| 状态推送 | engine.onStatus + scheduler.onState |
| tooltip / 工具栏样式 | helper/const.ts `TOOLTIP` / `TOOLBAR` / `EVOLVE` |

---

## 8. 已知边界

- 3D 支持原语 Rect/Line/Arc（Text/Curve/Triangle/Circle/Ring 静默跳过）不开深度缓冲
- interact 一帧滞后（消费上一帧空间索引 设计取舍）
- 大域全量扫描（域大时优于格子查询 权衡保留）
- 增量数据通道（结构 diff）为扩展方向 无消费者不预建
