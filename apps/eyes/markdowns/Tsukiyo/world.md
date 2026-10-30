## Tsukiyo 图表

Tsukiyo（月读）是极简 2D/3D 可视化库，采用链式 API：`input → scale → shape → coord → paths → layering → draw`。`.draw('3d')` 启用 WebGPU 3D 后端 — 同一链式 API。

**执行流职责：**
- `input` — 标准归一：接收原始数据，归一为内部可识别的标准元素
- `scale` — 维度划分：按 dim 拆出图形维度，展开 nx/ny/nr 相对声明
- `shape` — 图元定型：图元 → 图形，选定 shape 原语 + 固定几何（柱宽 / 半径 / 弯曲度）
- `coord` — 图形定位：挑选适配的坐标定位准则，为每个图形钉好基准锚点
- `paths` — 路径封闭：跨图形 Δ 连接 + 闭合链填充（支持自定义 road hook）
- `layering` — 高级视觉布局：取景 + 脏域合并 + 视锥剔除 + 子分层 → 绘制批次
- `draw` — 最终绘制：flush 绘制 + anim 锚点生长推进

图表类型 = 坐标系规则 + 图形映射的组合，不是独立类。

### 柱状图（Bar）

**示例**
<div>
  <div style="display:flex;gap:16px">
    <div ref="barRef" class="tsukiyo-chart" style="flex:1;height:200px"></div>
    <div ref="barGroupRef" class="tsukiyo-chart" style="flex:1;height:200px"></div>
  </div>
  <div style="margin-top: 10px">
    <div ref="comboTopRef" class="tsukiyo-chart" style="flex:1.4 1 0;min-width:0;height:200px"></div>
  </div>
</div>

**代码 — 基础柱状图**

```html
<template>
  <div ref="barRef" style="width:100%;height:200px"></div>
</template>

<script setup>
  import { getCurrentInstance, onMounted, ref } from 'vue'
  const { proxy } = getCurrentInstance()
  const { $K1TsukiyoX: Tsukiyo, $K1ShapesX: Shapes, $K1RgbaX: rgba } = proxy

  const barRef = ref()
  onMounted(async () => {
    const canvas = document.createElement('canvas')
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    barRef.value.appendChild(canvas)

    await new Tsukiyo(canvas)
      .input([10, 80, 45, 120, 60])
      .coord('Bar')
      .shape((el, p, i) => Shapes.rect(30, rgba(100, 149, 237, 200)))
      .draw()
  })
</script>
```

> **数据流说明**：`shape` 阶段声明原语类型 + 固定几何参数（如柱宽 `30`），`h=0` 为占位值。柱高由 `paths` 阶段按 `Hm_map(value, v0, v1, 0, h)` 从基线长出后覆写（`coord` 只负责锚点定位）。

**代码 — 多组柱状图**

```html
<template>
  <div ref="barGroupRef" style="width:100%;height:200px"></div>
</template>

<script setup>
  import { getCurrentInstance, onMounted, ref } from 'vue'
  const { proxy } = getCurrentInstance()
  const { $K1TsukiyoX: Tsukiyo, $K1ShapesX: Shapes, $K1RgbaX: rgba } = proxy

  const barGroupRef = ref()

  // 三组并列 = 零配置：内置 Axis.band 会自动按 dY 把每列等分成子列
  // CoordCtx 字段速查：w/h 视口 · dX/dY 维度数 · v0/v1/vΣ 值域 · x0/x1 数值 x 域
  const Series = [
    rgba(100, 149, 237, 200),
    rgba(255, 99, 71, 200),
    rgba(60, 179, 113, 200),
  ]

  onMounted(async () => {
    const canvas = document.createElement('canvas')
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    barGroupRef.value.appendChild(canvas)

    await new Tsukiyo(canvas)
      .input([
        { name: 'Q1', revenue: 120, cost: 80, profit: 40 },
        { name: 'Q2', revenue: 100, cost: 60, profit: 60 },
        { name: 'Q3', revenue: 140, cost: 90, profit: 50 },
      ])
      .scale({ dimX: 'name', dimY: ['revenue', 'cost', 'profit'] })
      .coord('Bar') // ← 内置，自动 dY 分组
      // the business value is the bar HEIGHT — stretching a bar in evolve
      // mode edits its value (any edge); the width is engine-internal
      .shape((el, p, i, ctx) => Shapes.rect(14, Series[(i / ctx.dY) | 0]))
      .draw()
  })
</script>
```

> **分组柱说明**：**零配置**。`Axis.band` 的投影就是 `(iX + (dY > 1 ? (iY + 0.5) / dY : 0.5)) / dX * w` —— 每列按 `dY` 自动等分成子列，不需要自定义定位器、不需要任何间距参数。间距永不进 `shape.geo`（那是布局，不是形状属性）；若确需**非均匀**间距，写一个投影函数或 `Band.w([2, 1, 3])` 即可，仍然零配置项。

### 高度自定制：四组柱 + 组内短虚线 + 组间波浪桥接

一个案例同时用上三件事：**两种自定制形状（柱 / 双轨波浪）**、**跨帧时序（`λDelay`）**、**数据序即 z 序**。

**示例**

<div ref="comboRef" class="tsukiyo-chart" style="width:100%;height:240px"></div>

```html
<template>
  <div ref="comboRef" style="width:320px;height:240px"></div>
</template>

<script setup>
  import { getCurrentInstance, onMounted, ref } from 'vue'
  const { proxy } = getCurrentInstance()
  const { $K1TsukiyoX: Tsukiyo, $K1ShapesX: Shapes, $K1RgbaX: rgba } = proxy

  const comboRef = ref()

  onMounted(async () => {
    // ① 圆角柱 — 锚点在柱顶，h>0 向下落到基线（与内置 rect 同向）
    const bar = Shapes.custom({
      kind: 'rect', fill: true,
      λDelay: 0,
      slots: { w: 20, k: 1 },
      geo: ({ w, h, k }, o) => {
        const r = Math.min(3 * k, w / 2, Math.abs(h) / 2)   // 圆角不得超过半宽/半高
        o.moveTo(-w / 2 + r, 0)
        o.lineTo(w / 2 - r, 0)
        o.quadraticCurveTo(w / 2, 0, w / 2, r)
        o.lineTo(w / 2, h - r)
        o.quadraticCurveTo(w / 2, h, w / 2 - r, h)
        o.lineTo(-w / 2 + r, h)
        o.quadraticCurveTo(-w / 2, h, -w / 2, h - r)
        o.lineTo(-w / 2, r)
        o.quadraticCurveTo(-w / 2, 0, -w / 2 + r, 0)
        o.closePath()
      },
    })

    // ② 组内短虚线 — 直的短虚线（连相邻柱顶）
    const dash = Shapes.custom({
      kind: 'line', lineWidth: 1.2, dash: [3, 3], λDelay: 6,
      slots: {},
      geo: ({ w, h }, o) => { o.moveTo(0, 0); o.lineTo(w, h) },
    })

    // ③ 组间双 〰️ 波浪 — 正弦多周期采样，两条平行轨道（法向恒定间距）
    //   sin 在两端为 0 → 波浪端点精确落在锚点，两端同高（wv 取全柱平均）
    const AMP_PX = 10
    const wave = Shapes.custom({
      kind: 'line', lineWidth: 1.5, λDelay: 12,
      slots: { amp: 0.26, gap: 6, turns: 2 },
      geo: ({ w, h, amp, gap, turns }, o) => {
        const n = Math.hypot(w, h) || 1
        const [ux, uy] = [-h / n, w / n]
        const a = Math.min(n * amp, AMP_PX)
        const N = Math.max(8, Math.round(turns * 8))
        for (const s of [0, 1]) {
          const g = (s - 0.5) * gap                      // constant gap along the normal
          o.moveTo(ux * g, uy * g)                       // parallel tracks, same-phase wave
          for (let k = 1; k <= N; k++) {
            const t = k / N
            const off = Math.sin(t * turns * Math.PI * 2) * a + g
            o.lineTo(w * t + ux * off, h * t + uy * off)
          }
        }
      },
    })

    // 数据 —— 组为列（dimX）, 六列为系列（dimY）
    // 连线槽 value 复用源柱值（锚点落柱顶）, wv 取全柱平均（桥接两端同高）
    const BIGS = ['G1', 'G2', 'G3', 'G4']
    const COLS = ['c1', 'c2', 'c3', 'd1', 'd2', 'wv']
    const VAL = [[30, 55, 42], [62, 48, 70], [38, 66, 52], [72, 44, 60]]
    const AVG = (Math.max(...VAL.flat()) - Math.min(...VAL.flat())) / 2
    const raw = BIGS.map((big, gi) => {
      const [v1, v2, v3] = VAL[gi]
      return { big, c1: v1, c2: v2, c3: v3, d1: v1, d2: v2, wv: AVG }
    })
    const nCol = COLS.length            // 6
    const BAR_N = 3                     // 每组 3 根柱

    const canvas = document.createElement('canvas')
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    comboRef.value.appendChild(canvas)

    await new Tsukiyo(canvas)
      .input(raw)
      .scale({ dimX: 'big', dimY: COLS })
      .coord('Bar')                                  // 零配置：dY 自动分子列
      .anim('snap')                                  // 静态结构演示
      .shape((el, p, i) => {
        const sub = i % nCol
        if (sub < BAR_N) return bar({ w: 14 }, rgba(91, 143, 249, 220))   // 柱
        if (sub < nCol - 1) return dash(rgba(255, 165, 0, 220))           // 组内短虚线
        return wave({ amp: 0.26 }, rgba(255, 140, 66, 220))               // 组间波浪
      })
      .paths((el, i, m) => {
        const sub = i % nCol
        const g = Math.floor(i / nCol)
        if (sub < BAR_N) return { Δi: -1 }                               // 柱不连
        const hop = (a, b) => ({                                         // 柱顶 ↔ 柱顶
          Δi: b,
          ΔfromP: [m.x[a] - m.x[i], m.y[a] - m.y[i]],
          ΔtoP: [0, 0],
          Δloop: false,
        })
        if (sub === BAR_N) return hop(g * nCol, g * nCol + 1)             // d1: c1 顶 → c2 顶
        if (sub === BAR_N + 1) return hop(g * nCol + 1, g * nCol + 2)     // d2: c2 顶 → c3 顶
        // 组间波浪 — 末组无下一组，不桥接；两端钉在全柱平均高度（水平桥接）
        const from = g * nCol + (BAR_N - 1)
        const to = (g + 1) * nCol
        if (to >= m.count) return { Δi: -1 }
        return {
          Δi: to,
          ΔfromP: [m.x[from] - m.x[i], 0],
          ΔtoP: [0, m.y[i] - m.y[to]],
          Δloop: false,
        }
      })
      .draw()
  })
</script>
```

> **三件事的分工**（这是本案例的核心）：
>
> | 关注点 | 归属 | 写法 |
> |---|---|---|
> | 柱宽 / 波幅 / 平行间距 | **shape.slots** | `bar({ w: 14 })`、`wave({ amp: 0.26 })` |
> | 组内 / 组间间距 | **scale + Axis.band** | 零配置（`dX × dY` 天然等分） |
> | 谁连谁 | **paths** | 柱槽 `{ Δi: -1 }`；虚线槽 hop 柱顶；波浪槽 `{Δi, ΔfromP, ΔtoP}` 钉在平均高度 |
> | 同帧层次（柱 → 虚线 → 波浪） | **数据序** | 每组槽序 = 3 柱 + 2 虚线 + 1 波浪 |
> | 跨帧时序（柱先长完） | **λDelay** | `0 / 6 / 12`，`anim` 从负值起步 |
>
> 桥接的 `w / h` 由 `paths` 的 Δ 直接给出（本槽锚点 → 目标锚点的差），因此形状的 `geo` 里不需要自己算坐标——这正是"Δ 差"与"值映射"两条尺寸来源的分工。组间波浪的 `wv` 值取全柱平均，`ΔfromP/ΔtoP` 把两端钉在同一高度 → 水平桥接。

### 散点图（Point）

散点图 = `{ x: Axis.x, y: Axis.v }`（双数值连续轴）+ `Shapes.circle` 的组合 — 投影就是纯函数，无需组合子、无需内置图表类型。

**示例**

<div ref="pointRef" class="tsukiyo-chart" style="height:200px"></div>

**代码**

```html
<template>
  <div ref="pointRef" style="width:100%;height:200px"></div>
</template>

<script setup>
  import { getCurrentInstance, onMounted, ref } from 'vue'
  const { proxy } = getCurrentInstance()
  const { $K1TsukiyoX: Tsukiyo, $K1ShapesX: Shapes, $K1RgbaX: rgba, $K1AxisX: Axis, $K1RadarX: Radar, $K1GrowX: Grow } = proxy

  const pointRef = ref()
  onMounted(async () => {
    const canvas = document.createElement('canvas')
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    pointRef.value.appendChild(canvas)

    const colors = [
      rgba(100, 149, 237, 100),
      rgba(255, 99, 71, 100),
      rgba(60, 179, 113, 100),
    ]

    await new Tsukiyo(canvas)
      // 散点的两个轴都是**数值连续**：x 读 x 字段、y 读 value
      .input([
        { x: 12, y: 40 }, { x: 35, y: 78 }, { x: 58, y: 52 },
        { x: 74, y: 105 }, { x: 90, y: 60 }, { x: 26, y: 96 },
        { x: 48, y: 30 }, { x: 82, y: 88 },
      ])
      .scale({ dimX: 'x', dimY: ['y'] })            // x 数值域进 ctx.x0/x1
      .coord({ x: Axis.x, y: Axis.v, dom: { x: 'x' }, init: { y0: false }, grid: 'cartesian' })
      .shape((el, p, i) => Shapes.circle(7, colors[i % colors.length]))
      .draw()
  })
</script>
```

### 折线图（Line）

> **生长观感**：`kind: 'line' | 'curve'` 的补间是**沿线走向伸张**（`w *= p; h *= p`），不是纵向长高 —— 所以折线是一段段「沿着自己的方向」长出来的。饼图/玫瑰同理走**角度扫掠**（半径恒定），散点是**径向放大**。这就是「统一成一个通用效果配置」的实现：`ShapeSpec.tween` 缺省按 `kind` 推导，需要特殊效果时直接覆盖它。

**示例**

<div style="display:flex;gap:16px">
  <div ref="line0Ref" class="tsukiyo-chart" style="flex:1;height:200px"></div>
  <div ref="line1Ref" class="tsukiyo-chart" style="flex:1;height:200px"></div>
  <div ref="sineRef" class="tsukiyo-chart" style="flex:1;height:200px"></div>
</div>

**代码 — 双轨折线图（Line + Curve 叠加）**

```html
<template>
  <div ref="lineRef" style="width:100%;height:200px"></div>
</template>

<script setup>
  import { getCurrentInstance, onMounted, ref } from 'vue'
  const { proxy } = getCurrentInstance()
  const { $K1TsukiyoX: Tsukiyo, $K1ShapesX: Shapes, $K1RgbaX: rgba } = proxy

  const lineRef = ref()
  onMounted(async () => {
    const canvas = document.createElement('canvas')
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    lineRef.value.appendChild(canvas)

    await new Tsukiyo(canvas)
      .input([10, 80, 45, 120, 60])
      .coord('Bar')
      .shape((el, p, i) => [
        Shapes.line(rgba(255, 99, 71, 255)),
        // bend 0.1 — gentle smooth track hugging the straight line
        Shapes.curve(rgba(100, 149, 237, 180), undefined, undefined, 0.1),
      ])
      .draw()
  })
</script>
```

**代码 — 正弦曲线（paths 自定义封闭路径）**

```html
<template>
  <div ref="sineRef" style="width:100%;height:200px;"></div>
</template>

<script setup>
  import { getCurrentInstance, onMounted, ref } from 'vue'
  const { proxy } = getCurrentInstance()
  const { $K1TsukiyoX: Tsukiyo, $K1ShapesX: Shapes, $K1RgbaX: rgba } = proxy

  const sineRef = ref()

  // ringPaths — 声明式链路：loop 让末点回绕首点
  // the tail wraps around to the head, forming a closed smooth ring
  const ringPaths = { loop: true }

  onMounted(async () => {
    const canvas = document.createElement('canvas')
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    sineRef.value.appendChild(canvas)

    // 同数据源 — 与基础折线图相同的输入，仅通过 paths road 改变展示形式
    await new Tsukiyo(canvas)
      .input([10, 80, 45, 120, 60])
      .coord('Bar')
      .shape((el, p, i) => Shapes.curve(rgba(100, 149, 237, 220)))
      .paths(ringPaths)
      .draw()
  })
</script>
```

> **paths road 说明**：与基础折线图相同的 `input` + `coord(Bar)`，仅通过 `.paths(ringPaths)` 改变展示形式。`.paths()` 不传时内置 defaultRoad（`{Δi: i+1}`，末点断开开放折线）；`{ loop: true }` 让末点回绕首点形成封闭平滑曲线 —— **声明式四字段（loop/step/by/fill）覆盖绝大多数链路，复杂拓扑才写回调函数**。


### 饼图（Pie）

**示例** — 左：均匀饼图；右：南丁格尔玫瑰（双轨波浪桥接）

<div style="display:flex;gap:16px">
  <div ref="pieRef" class="tsukiyo-chart" style="flex:1;height:220px"></div>
  <div ref="roseRef" class="tsukiyo-chart" style="flex:1;height:220px"></div>
</div>

**代码**

```html
<template>
  <div ref="pieRef" style="width:100%;height:200px"></div>
</template>

<script setup>
  import { getCurrentInstance, onMounted, ref } from 'vue'
  const { proxy } = getCurrentInstance()
  const { $K1TsukiyoX: Tsukiyo, $K1ShapesX: Shapes, $K1RgbaX: rgba, $K1AxisX: Axis } = proxy

  const pieRef = ref()
  onMounted(async () => {
    const canvas = document.createElement('canvas')
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    pieRef.value.appendChild(canvas)

    const colors = [
      rgba(100, 149, 237, 220),
      rgba(255, 99, 71, 220),
      rgba(60, 179, 113, 220),
    ]

    await new Tsukiyo(canvas)
      .input([
        { name: 'A', val: 30 },
        { name: 'B', val: 45 },
        { name: 'C', val: 25 },
      ])
      .scale({ dimX: 'name', dimY: ['val'] })
      .coord({ x: Axis.cx, y: Axis.cy, grid: 'polar' })
      .shape((el, p, i) => Shapes.sector(60, colors[i % colors.length]))   // 扇段语法糖 — 角度按 value 比例分配
      .draw()
  })
</script>

```

### 南丁格尔玫瑰图（Nightingale Rose）— 双轨波浪桥接

玫瑰图 = **半径随值变化**的扇形 + **每两个扇形之间用双 〰️ 平行波浪线桥接**。桥接落在**全扇平均半径**的环上（与柱形图「平均高度桥接」同理），端点在两扇相向的边角；缝隙是**角度基准**的固定收缩角（`gap: 0.12` rad/边），桥接跨角 = 缝隙角 —— 缝隙多宽、波浪就多长。

```html
<template>
  <div ref="roseRef" style="width:100%;height:220px"></div>
</template>

<script setup>
  import { getCurrentInstance, onMounted, ref } from 'vue'
  const { proxy } = getCurrentInstance()
  const { $K1TsukiyoX: Tsukiyo, $K1ShapesX: Shapes, $K1RgbaX: rgba, $K1AxisX: Axis, $K1GrowX: Grow } = proxy

  const roseRef = ref()

  onMounted(async () => {
    // 花瓣 — 半径 ∝ 值（Grow.r 负责值→像素），角度带由 paths 按值比切分；
    // 两端各收缩固定角 gap（角度基准，不用 asin 像素换算 —— 那会让小半径扇
    // 两端收缩到零宽而整体消失）→ 扇间缝隙 ≈ 2·gap 弧度，明显可辨
    const petal = Shapes.custom({
      kind: 'arc',
      fill: true,
      grow: Grow.r,
      slots: { r: 40, startAng: NaN, endAng: NaN, gap: 0.12 },
      geo: ({ r, startAng, endAng, gap }, o) => {
        const g = Math.min(gap, (endAng - startAng) / 2)
        o.moveTo(0, 0)
        o.arc(0, 0, r, startAng + g, endAng - g)
        o.closePath()
      },
    })

    // 桥接 — 同一个扇区槽位再挂两条平行 〰️ 波浪线，落在**全扇平均半径**的环上：
    // 所有桥接同一条半径（与柱形图「平均高度桥接」同理），端点在两扇相向的边角，
    // 桥接跨角 = 扇间缝隙角（同一 gap 派生，缝隙多宽波浪就多长）。
    // 单周期正弦（sin 两端为 0 → 波浪精确落在两端点）；两条轨道都走主路径。
    const RAIL_AMP_PX = 10
    const rail = Shapes.custom({
      kind: 'line',
      lineWidth: 1.2,
      slots: { amp: 0.4, gap: 6, turns: 1 },
      geo: ({ w, h, amp, gap, turns }, o) => {
        const n = Math.hypot(w, h) || 1
        const [ux, uy] = [-h / n, w / n]        // Δ 的法向 → 自适应旋转
        const a = Math.min(n * amp, RAIL_AMP_PX)
        const N = Math.max(8, Math.round(turns * 12))
        for (const s of [0, 1]) {
          const g = (s - 0.5) * gap             // 沿法向恒定间距
          o.moveTo(ux * g, uy * g)              // 双轨：平行错开（同相位波浪）
          for (let k = 1; k <= N; k++) {
            const t = k / N
            const off = Math.sin(t * turns * Math.PI * 2) * a + g
            o.lineTo(w * t + ux * off, h * t + uy * off)
          }
        }
      },
    })

    const colors = [rgba(100,149,237,220), rgba(255,99,71,220), rgba(60,179,113,220), rgba(255,165,0,220)]
    const data = [
      { name: 'A', val: 30 }, { name: 'B', val: 45 },
      { name: 'C', val: 25 }, { name: 'D', val: 70 },
    ]

    const canvas = document.createElement('canvas')
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    roseRef.value.appendChild(canvas)

    await new Tsukiyo(canvas)
      .input(data)
      .scale({ dimX: 'name', dimY: ['val'] })
      .coord({ x: Axis.cx, y: Axis.cy, grid: 'polar' })
      // 每段数据 = 两个槽（花瓣 + 桥接），层序就是 lane
      .shape((el, p, i) => [petal(colors[i % colors.length]), rail({ amp: 0.4 }, rgba(255, 200, 120, 200))])
      .paths((el, i, m) => {
        // 花瓣层（lane 0）不连：扇形各自独立，闭合由 geo 的 closePath 完成
        // 桥接层（lane 1）端点 = **全扇平均半径** R 上的两扇相向边角：
        // 所有桥接落在同一条半径环上（同柱形图「平均高度」），闭合成环；
        // 边角收缩量与 petal.geo 同一 gap → 桥接跨角 = 扇间缝隙角
        if (i % 2 === 0) return { Δi: -1 }
        let rSum = 0, pn = 0                     // R = 全扇平均半径
        for (let k = 0; k < m.count; k += 2) { rSum += m.aux[k * 5]; pn++ }
        const R = rSum / pn
        const cur = i - 1                        // 本花瓣（槽序 ⟨瓣0, 桥0, 瓣1, …⟩）
        const nx = (cur + 2) % m.count           // 下一花瓣（末瓣回绕首瓣）
        const edge = (k, atEnd) => {
          const a = k * 5
          const g = Math.min(m.aux[a + 3], (m.aux[a + 2] - m.aux[a + 1]) / 2)
          const t = atEnd ? m.aux[a + 2] - g : m.aux[a + 1] + g   // 尾边 / 头边
          return [R * Math.cos(t), R * Math.sin(t)]
        }
        const [fx, fy] = edge(cur, true)         // 本扇尾边（半径 R）
        const [tx, ty] = edge(nx, false)         // 下扇头边（半径 R）
        return { Δi: nx, ΔfromP: [fx, fy], ΔtoP: [tx, ty] }
      })
      .draw()
  })
</script>
```

> **要点**：`petal` 的半径由 `grow` 参数控制（值越大 → 扇形越长），角度仍按 `value` 切分；两端各收缩固定角 `gap`（**角度基准** —— 像素换算会让小半径扇收缩到零宽而消失）。`rail` 的 road 先算**全扇平均半径** `R = mean(r)`，端点取 `R` 上两扇相向的边角 → 所有桥接落在同一条半径环上闭合成环（同柱形图「平均高度桥接」）。单周期正弦双轨（沿法向恒定间距 `gap`），包围盒/命中/脏域由框架统一接管。

### 雷达图（Radar）

雷达图使用 `coord({ x: Radar.x, y: Radar.y, grid: 'radar' })` + `shape(triangle)` 组合。`dimX` 为系列（每个三角形切片属于一个系列），`dimY` 为维度（雷达图的辐射轴）。`paths` 执行流自动组装三角扇（圆心 + 相邻维度顶点），形成完整多边形填充，hover 时单个切片径向外凸高亮。


**示例**

<div ref="radarRef" class="tsukiyo-chart" style="width:100%;height:300px"></div>

**代码**

```html
<template>
  <div ref="radarRef" style="width:100%;height:300px"></div>
</template>

<script setup>
  import { getCurrentInstance, onMounted, ref } from 'vue'
  const { proxy } = getCurrentInstance()
  const { $K1TsukiyoX: Tsukiyo, $K1ShapesX: Shapes, $K1RgbaX: rgba, $K1RadarX: Radar } = proxy

  const radarRef = ref()
  onMounted(async () => {
    const canvas = document.createElement('canvas')
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    radarRef.value.appendChild(canvas)

    await new Tsukiyo(canvas)
      .input([
        { user: 'kurumi',  power: 30, speed: 100, magic: 50, defense: 80, luck: 40 },
        { user: 'origami', power: 80, speed: 80,  magic: 80, defense: 60, luck: 70 },
        { user: 'kotori',  power: 50, speed: 60,  magic: 90, defense: 40, luck: 90 },
      ])
      .scale({ dimX: 'user', dimY: ['power', 'speed', 'magic', 'defense', 'luck'] })
      .coord({ x: Radar.x, y: Radar.y, grid: 'radar' })
      .shape((el, p, i) => {
        const colors = [
          rgba(100, 149, 237, 220),
          rgba(255, 99, 71, 220),
          rgba(60, 179, 113, 220),
          rgba(255, 165, 0, 220),
          rgba(138, 43, 226, 220),
        ]
        // 按系列着色 — 每个系列（dimYCount 个切片）同色
        return Shapes.triangle(colors[Math.floor(i / 5) % colors.length])
      })
      .draw()
  })
</script>
```

### 3D 图表（WebGPU）

`.draw('3d')` 启用 WebGPU 3D 后端 — 世界系 = 2D 屏幕系 + Y 翻转 + Z 挤出。数据链（`input → scale → shape → coord`）与 2D 完全一致，仅切换 `draw` 参数。WebGPU 不可用或初始化失败时自动回退 Canvas2D。

**示例**

<div style="display:flex;gap:16px">
  <div ref="bar3dRef" class="tsukiyo-chart" style="flex:1;height:200px"></div>
  <div ref="pie3dRef" class="tsukiyo-chart" style="flex:1;height:200px"></div>
</div>

**代码 — 3D 柱状图**

```html
<template>
  <div ref="bar3dRef" style="width:100%;height:200px"></div>
</template>

<script setup>
  import { getCurrentInstance, onMounted, ref } from 'vue'
  const { proxy } = getCurrentInstance()
  const { $K1TsukiyoX: Tsukiyo, $K1ShapesX: Shapes, $K1RgbaX: rgba } = proxy

  const bar3dRef = ref()
  onMounted(async () => {
    const canvas = document.createElement('canvas')
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    bar3dRef.value.appendChild(canvas)

    // 与 2D 柱状图完全相同的数据链 — 仅 .draw() → .draw('3d')
    await new Tsukiyo(canvas)
      .input([10, 80, 45, 120, 60])
      .coord('Bar')
      .shape((el, p, i) => Shapes.rect(30, rgba(100, 149, 237, 255)))
      .draw('3d')
  })
</script>
```

**代码 — 3D 饼图**

```html
<template>
  <div ref="pie3dRef" style="width:100%;height:200px"></div>
</template>

<script setup>
  import { getCurrentInstance, onMounted, ref } from 'vue'
  const { proxy } = getCurrentInstance()
  const { $K1TsukiyoX: Tsukiyo, $K1ShapesX: Shapes, $K1RgbaX: rgba, $K1AxisX: Axis } = proxy

  const pie3dRef = ref()
  onMounted(async () => {
    const canvas = document.createElement('canvas')
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    pie3dRef.value.appendChild(canvas)

    // 与 2D 饼图完全相同的数据链 — 扇段挤出为圆柱段
    await new Tsukiyo(canvas)
      .input([
        { name: 'A', val: 30 },
        { name: 'B', val: 45 },
        { name: 'C', val: 25 },
        { name: 'D', val: 70 },
        { name: 'E', val: 100 },
      ])
      .scale({ dimX: 'name', dimY: ['val'] })
      .coord({ x: Axis.cx, y: Axis.cy, grid: 'polar' })
      .shape((el, p, i) => Shapes.sector(60, rgba(100, 149, 237, 255)))   // 扇段语法糖 — 角度按 value 比例分配
      .draw('3d')
  })
</script>
```

> **v1 边界**：支持 Rect（盒体）/ Line（薄旋转盒）/ Arc（圆柱扇段）；Text/Curve/Triangle/Circle 未注册 3D 材料 → 静默跳过；不开混合（fill 的 alpha 被忽略）；柱体厚度/光照/视角由 `C3D` 常量统一配置。

### 无限月读天幕（Mugen）

**示例**
<div>
  <div ref="mugenRef" class="tsukiyo-chart" style="width:100%;height:260px"></div>
</div>

**代码 — 写轮眼之月 + 地平线 + 斑立绘天幕**

```html
<template>
  <div ref="mugenRef" style="width:100%;height:260px"></div>
</template>

<script setup>
  import { getCurrentInstance, onMounted, ref } from 'vue'
  const { proxy } = getCurrentInstance()
  const { $K1TsukiyoX: Tsukiyo, $K1ShapesX: Shapes, $K1RgbaX: rgba, $K1DrawMugenX: drawMugen } = proxy

  const mugenRef = ref()
  onMounted(async () => {
    const canvas = document.createElement('canvas')
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    mugenRef.value.appendChild(canvas)

    await new Tsukiyo(canvas)
      .input([42, 68, 35, 88, 52, 74])
      .coord('Bar')
      .shape((el, p, i) => Shapes.rect(30, rgba(255, 118, 100, 200)))
      .layering(() => ({ layers: [{ z: -1, paint: drawMugen }] }))
      .draw()
  })
</script>
```

> **天幕语义**：`drawMugen` 是一个 paint 自绘层 — 写轮眼之月（左上）、地平线（底部）、斑剪影立绘（右下 侧身 面朝月亮）一次画完。屏幕锚定：纯视口比例布局，视图平移/缩放时天幕纹丝不动，数据在其下生长。静止后共享时钟自停，天幕零持续开销。

## API


| 方法     | 说明                              | 参数                          | 返回   |
| -------- | --------------------------------- | ----------------------------- | -------- |
| input    | 输入阶段 - 原始数据接收器        | `(raw: any[])` | `this` |
| scale    | 测绘阶段 - 图形维度划分器        | `(dim: DimConf)` | `this` |
| coord    | 图形定位器 - 坐标系选取+位置定位；唯一内置简写 `Bar`（分类 × 值），其余用纯函数组合：`Axis.band / v / x / cx / cy`、`Radar.x / y`，也可直接写投影函数 | `(rule: string \| ITsukiyoLocator \| fn)` | `this` |
| shape    | 图元定型 - 原语类型选择+固定几何参数 | `(fn: ShapeFn)` | `this`   |
| paths    | 图形路径封闭器 - 跨图形 Δ 连接与闭合链填充（road 回调：`{Δi, ΔfromP?, ΔtoP?, Δr?, 'Δangle°'?, Δloop?, fill?}`）；不传 = defaultRoad（`{Δi: i+1}` 折线紧密连接） | `(fn?: RoadFn)` | `this` |
| anim     | 生长通道 — `'grow'` 生长动画 / `'snap'` 定格（逐帧重投数据场景） | `(mode: 'grow' \| 'snap')` | `this` |
| layering | 子分层 — 每层一个完整子引擎（z 排序）；不传 = 默认网格背景层 | `(fn?: LayoutFn)` | `this` |
| draw     | 输出阶段 - 图形渲染绘制器（2D Canvas / 3D WebGPU） | `(mode?: '2d' \| '3d')`，默认 `'2d'`；`'3d'` 时 WebGPU 不可用自动回退 | `Promise<Engine>` |
| data     | 运行期数据更新（引擎运行后） | `(raw: any[], dim?: DimConf)` | `this` |
| destroy  | 停止引擎并释放调度与子层 | `()` | `void` |

>
> **月读工具栏**：每个画布右侧自动竖排三个按钮 — **月读演进**（开关演化模式）、**月读状态**（四色状态点：未进行 / 持续月读中 / 已完成 / 已暂停，engine push-on-change 推送，绝不轮询）、**收起/展开**；演化模式中额外出现**版本历史**按钮（任意版本点击回滚；行悬浮弹出该版本的画布快照缩略图）。
>
> **月读演化**：演化模式下图形可**拖拽调序**（插入式，同 dimX 分组整体搬移；基元数组按值重插；极坐标沿圆周拖到目标角度区，圆心射线指示插入位）与**点击锁定 + 边缘拉伸调尺寸**（点击图形锁定副本幽灵，光标进入幽灵边缘 8px 分区即拉伸——四边/四角定方向、对侧锚定，规则与不规则图形同一套机制）——全程只操作持久驻留的幽灵副本（画布像素快照，落位目标位置/尺寸，可连续再抓取微调），零 SoA 写入、时钟保持停摆；**鼠标松开只暂存，绝不写回**——画布顶部居中出现 ✓ 确认 / ✗ 丢弃确认条，点 ✓ 才一次性写回 raw 源数据并经 `data()` 重投递（整代重生成 + 重演生长 + 版本入栈）；✗ 丢弃 / 退出演化 / 外部重投数据则丢弃暂存（画布从未变过）。
>
> **值逆映射三通道，全部由引擎正向映射派生**（零按图表类型的分支公式；拉伸只改该图形绑定的业务值——scale 阶段 dimY 的那个维度）：①**值尺寸通道**——把 `value±ε` 喂回形状自己的 `grow` 钩子，写了哪些键就是值拥有的维度：柱形图的业务值 = 柱高（`Grow.y`），拉柱顶/柱底都只改柱高，观察量是幽灵盒增量对斜率的最小二乘；②**极坐标通道**——玫瑰径向走同一份 grow 重放（`Δv = dr/r′`），饼图/玫瑰切向走 **paths 值切分的代数逆**（判据与切分公式同源：`band = value/vΣ·TAU`，值 = 角度占比，其余扇自动重分）；③**锚点通道**——`value±ε` 喂回同一投影得切向量（**任意自定义投影自动获得正确的值编辑**），观察量是锚点在拉伸变形下的自身位移（移动边位移 × 锚点在包围盒内的分数）。边界：引擎内部派生尺寸（柱宽、散点半径、线段长、扇半径）不随拉伸变化；3D 不支持。

<script setup>
  import { getCurrentInstance, onMounted, ref } from 'vue'
  const { proxy } = getCurrentInstance()
  const { $K1TsukiyoX: Tsukiyo, $K1ShapesX: Shapes, $K1RgbaX: rgba, $K1AxisX: Axis, $K1RadarX: Radar, $K1GrowX: Grow, $K1DrawMugenX: drawMugen } = proxy

  const pointRef = ref()
  const barRef = ref()
  const barGroupRef = ref()
  const line0Ref = ref()
  const line1Ref = ref()
  const sineRef = ref()
  const pieRef = ref()
  const roseRef = ref()
  const comboTopRef = ref()   // 页首「柱状图」分组里的第三格
  const comboRef = ref()      // 「高度自定制」章节的独立示例
  const radarRef = ref()
  const bar3dRef = ref()
  const pie3dRef = ref()
  const mugenRef = ref()      // 「无限月读天幕」章节示例

  const colors = [
    rgba(100, 149, 237, 220),
    rgba(255, 99, 71, 220),
    rgba(60, 179, 113, 220),
    rgba(203, 166, 247, 220),
    rgba(138, 43, 226, 220)
  ]

  // 三组并列 = 零配置（内置 Axis.band 按 dY 自动分子列）

  // 闭合环 = 声明式：{ loop: true } 取代手写 ringRoad 回调
  const ringPaths = { loop: true }

  onMounted(async () => {
    // Point — 散点图（{ x: Axis.x, y: Axis.v } 双数值连续轴 + circle 形状）
    {
      const canvas = document.createElement('canvas')
      canvas.style.width = '100%'
      canvas.style.height = '100%'
      pointRef.value.appendChild(canvas)
      await new Tsukiyo(canvas)
        // 数值轴读字段，所以输入必须是带 x / y 字段的对象
        .input([
          { x: 12, y: 40 }, { x: 35, y: 78 }, { x: 58, y: 52 },
          { x: 74, y: 105 }, { x: 90, y: 60 }, { x: 26, y: 96 },
          { x: 48, y: 30 }, { x: 82, y: 88 },
        ])
        .scale({ dimX: 'x', dimY: ['y'] })
        .coord({ x: Axis.x, y: Axis.v, dom: { x: 'x' }, init: { y0: false }, grid: 'cartesian' })
        .shape((el, p, i) => Shapes.circle(7, colors[i % colors.length]))
        .draw()
    }

    // Bar — 基础柱状图
    {
      const canvas = document.createElement('canvas')
      canvas.style.width = '100%'
      canvas.style.height = '100%'
      barRef.value.appendChild(canvas)
      await new Tsukiyo(canvas)
        .input([10, 80, 45, 120, 60])
        .coord('Bar')
        .shape((el, p, i) => Shapes.rect(30, colors[i % colors.length]))
        .draw()
    }

    // Bar — 多组柱状图（paths 自定义分组定位）
    {
      const canvas = document.createElement('canvas')
      canvas.style.width = '100%'
      canvas.style.height = '100%'
      barGroupRef.value.appendChild(canvas)
      await new Tsukiyo(canvas)
        .input([
          { name: 'Q1', revenue: 120, cost: 80, profit: 40 },
          { name: 'Q2', revenue: 100, cost: 60, profit: 60 },
          { name: 'Q3', revenue: 140, cost: 90, profit: 50 },
        ])
        .scale({ dimX: 'name', dimY: ['revenue', 'cost', 'profit'] })
        .coord('Bar')                                  // ← 零配置分组
        .shape((el, p, i, ctx) => Shapes.rect(14, colors[(i / ctx.dY) | 0]))
        .draw()
    }

    // Line — 普通折线图 (测试 Curve三次贝塞尔)
    {
      const canvas = document.createElement('canvas')
      canvas.style.width = '100%'
      canvas.style.height = '100%'
      line0Ref.value.appendChild(canvas)
      await new Tsukiyo(canvas)
        .input([20, 210, 145, 280, 95])
        .coord('Bar')
        .shape((el, p, i) => Shapes.line(colors[0]))
        .anim('snap')
        .draw()
    }

    // Line — 双轨折线图（Line + Curve 叠加）
    {
      const canvas = document.createElement('canvas')
      canvas.style.width = '100%'
      canvas.style.height = '100%'
      line1Ref.value.appendChild(canvas)
      await new Tsukiyo(canvas)
        .input([10, 80, 45, 120, 60])
        .coord('Bar')
        .shape((el, p, i) => [
          Shapes.line(colors[1]),
          Shapes.curve(colors[0], undefined, undefined, 0.1),
        ])
        .anim('snap')
        .draw()
    }

    // Line — 正弦曲线（paths 自定义封闭路径，同数据源）
    {
      const canvas = document.createElement('canvas')
      canvas.style.width = '100%'
      canvas.style.height = '100%'
      sineRef.value.appendChild(canvas)
      await new Tsukiyo(canvas)
        .input([10, 80, 45, 120, 60])
        .coord('Bar')
        .shape((el, p, i) => Shapes.curve(colors[0]))
        .paths(ringPaths)
        .anim('snap')
        .draw()
    }

    // Pie
    {
      const canvas = document.createElement('canvas')
      canvas.style.width = '100%'
      canvas.style.height = '100%'
      pieRef.value.appendChild(canvas)
      await new Tsukiyo(canvas)
        .input([
          { name: 'A', val: 30 },
          { name: 'B', val: 45 },
          { name: 'C', val: 25 },
          { name: 'D', val: 70 },
          { name: 'E', val: 100 },
        ])
        .scale({ dimX: 'name', dimY: ['val'] })
        .coord({ x: Axis.cx, y: Axis.cy, grid: 'polar' })
        .shape((el, p, i) => Shapes.sector(60, colors[i % colors.length]))   // 扇段语法糖 — 角度按 value 比例分配
        .draw()
    }

    // Rose — 南丁格尔玫瑰（半径随值变化 + 扇间缝隙 + 平均半径双 〰️ 波浪桥接）
    {
      // petals — radius ∝ value (Grow.r); angle bands split by paths;
      // each end shrunk by a FIXED angular gap (no asin pixel conversion —
      // that collapses small-radius petals to zero width) → petals all stay
      const petal = Shapes.custom({
        kind: 'arc', fill: true,
        grow: Grow.r,                    // 半径 ∝ 值（值→像素的唯一 hook）
        slots: { r: 40, startAng: NaN, endAng: NaN, gap: 0.12 },
        geo: ({ r, startAng, endAng, gap }, o) => {
          const g = Math.min(gap, (endAng - startAng) / 2)
          o.moveTo(0, 0); o.arc(0, 0, r, startAng + g, endAng - g); o.closePath()
        },
      })
      // rails — parallel double sine waves riding the AVERAGE-radius ring:
      // every bridge sits at R = mean(petal radii) (the rose analog of the
      // combo's average-height bridge), endpoints on the facing petal edges
      // shrunk by the SAME gap → bridge span = inter-petal gap, one source
      const RAIL_AMP_PX = 10
      const rail = Shapes.custom({
        kind: 'line', lineWidth: 1.2,
        slots: { amp: 0.4, gap: 6, turns: 1 },
        geo: ({ w, h, amp, gap, turns }, o) => {
          const n = Math.hypot(w, h) || 1
          const [ux, uy] = [-h / n, w / n]
          const a = Math.min(n * amp, RAIL_AMP_PX)
          const N = Math.max(8, Math.round(turns * 12))
          for (const s of [0, 1]) {
            const g = (s - 0.5) * gap           // constant gap along the normal
            o.moveTo(ux * g, uy * g)            // parallel tracks, same-phase wave
            for (let k = 1; k <= N; k++) {
              const t = k / N
              const off = Math.sin(t * turns * Math.PI * 2) * a + g
              o.lineTo(w * t + ux * off, h * t + uy * off)
            }
          }
        },
      })
      const roseRaw = [
        { name: 'A', val: 30 }, { name: 'B', val: 45 },
        { name: 'C', val: 25 }, { name: 'D', val: 70 }, { name: 'E', val: 100 },
      ]
      const canvas = document.createElement('canvas')
      canvas.style.width = '100%'
      canvas.style.height = '100%'
      roseRef.value.appendChild(canvas)
      await new Tsukiyo(canvas)
        .input(roseRaw)
        .scale({ dimX: 'name', dimY: ['val'] })
        .coord({ x: Axis.cx, y: Axis.cy, grid: 'polar' })
        // 每段数据两个槽：花瓣 + 桥接（层序即 lane）
        .shape((el, p, i) => [
          petal(colors[i % colors.length]),
          rail({ amp: 0.4 }, rgba(255, 200, 120, 200)),
        ])
        .paths((el, i, m) => {
          // petal lanes never link (each closes itself); rail lanes ride the
          // AVERAGE-radius ring: endpoints at R = mean(petal radii) on the
          // facing petal edges (shrunk by the SAME gap as petal.geo) →
          // bridge span = inter-petal gap, closed as one wavy ring
          if (i % 2 === 0) return { Δi: -1 }
          let rSum = 0, pn = 0                   // R = mean petal radius
          for (let k = 0; k < m.count; k += 2) { rSum += m.aux[k * 5]; pn++ }
          const R = rSum / pn
          const cur = i - 1
          const nx = (cur + 2) % m.count
          const edge = (k, atEnd) => {
            const a = k * 5
            const g = Math.min(m.aux[a + 3], (m.aux[a + 2] - m.aux[a + 1]) / 2)
            const t = atEnd ? m.aux[a + 2] - g : m.aux[a + 1] + g   // trailing / leading edge
            return [R * Math.cos(t), R * Math.sin(t)]
          }
          const [fx, fy] = edge(cur, true)     // this petal's trailing edge (radius R)
          const [tx, ty] = edge(nx, false)     // next petal's leading edge (radius R)
          return { Δi: nx, ΔfromP: [fx, fy], ΔtoP: [tx, ty] }
        })
        .draw()
    }

    // Radar
    {
      const canvas = document.createElement('canvas')
      canvas.style.width = '100%'
      canvas.style.height = '100%'
      radarRef.value.appendChild(canvas)
      await new Tsukiyo(canvas)
        .input([
          { user: 'kurumi',  power: 30, speed: 100, magic: 50, defense: 80, luck: 40 },
          { user: 'origami', power: 80, speed: 80,  magic: 80, defense: 60, luck: 70 },
          { user: 'kotori',  power: 50, speed: 60,  magic: 90, defense: 40, luck: 90 },
        ])
        .scale({ dimX: 'user', dimY: ['power', 'speed', 'magic', 'defense', 'luck'] })
        .coord({ x: Radar.x, y: Radar.y, grid: 'radar' })
        .shape((el, p, i) => {
          // 按系列着色 — 每个系列（5 个维度切片）同色，Math.floor(i/5) 区分系列
          return Shapes.triangle(colors[Math.floor(i / 5) % colors.length])
        })
        .draw()
    }

    // Combo（页首分组）— 四组柱 + 组内短虚线 + 组间双波浪（末组回绕首组）
    {
      // 圆角柱 — 锚点在柱顶，h>0 向**下**落到基线（与内置 rect 同向；
      // 早期写成 -h 会让柱子浮在锚点上方，视觉上从顶部倒挂）
      const bar = Shapes.custom({
        kind: 'rect', fill: true, λDelay: 0,
        slots: { w: 20, k: 1 },
        geo: ({ w, h, k }, o) => {
          const r = Math.min(3 * k, w / 2, Math.abs(h) / 2)
          o.moveTo(-w / 2 + r, 0)
          o.lineTo(w / 2 - r, 0)
          o.quadraticCurveTo(w / 2, 0, w / 2, r)
          o.lineTo(w / 2, h - r)
          o.quadraticCurveTo(w / 2, h, w / 2 - r, h)
          o.lineTo(-w / 2 + r, h)
          o.quadraticCurveTo(-w / 2, h, -w / 2, h - r)
          o.lineTo(-w / 2, r)
          o.quadraticCurveTo(-w / 2, 0, -w / 2 + r, 0)
          o.closePath()
        },
      })
      // 组内短虚线 — 直的短虚线（无弯度）
      const dash = Shapes.custom({
        kind: 'line', lineWidth: 1.2, dash: [3, 3], λDelay: 6,
        slots: {},
        geo: ({ w, h }, o) => { o.moveTo(0, 0); o.lineTo(w, h) },
      })
      // 组间双 〰️ 波浪 — 正弦多周期采样，两条平行轨道（法向恒定间距 gap）。
      // sin 在两端为 0 → 波浪端点精确落在锚点；波幅取绝对像素上限防长段鼓成巨弧。
      const AMP_PX = 10
      const wave = Shapes.custom({
        kind: 'line', lineWidth: 1.5, λDelay: 12,
        slots: { amp: 0.26, gap: 6, turns: 2 },
        geo: ({ w, h, amp, gap, turns }, o) => {
          const n = Math.hypot(w, h) || 1
          const [ux, uy] = [-h / n, w / n]
          const a = Math.min(n * amp, AMP_PX)
          const N = Math.max(8, Math.round(turns * 8))     // samples per track
          for (const s of [0, 1]) {
            const g = (s - 0.5) * gap                      // constant gap along the normal
            o.moveTo(ux * g, uy * g)                       // parallel tracks, same-phase wave
            for (let k = 1; k <= N; k++) {
              const t = k / N
              const off = Math.sin(t * turns * Math.PI * 2) * a + g
              o.lineTo(w * t + ux * off, h * t + uy * off)
            }
          }
        },
      })

      const BIGS = ['G1', 'G2', 'G3', 'G4']
      // 每组的槽序 — 3 根柱 + 2 条组内虚线 + 1 条组间波浪
      // 连线槽的 value 复用所连柱的值（锚点落在柱顶）
      // wv 取**全柱平均** → 组间桥接两端同高（水平连线，不贴柱顶）
      const COLS = ['c1', 'c2', 'c3', 'd1', 'd2', 'wv']
      const VAL = [[30, 55, 42], [62, 48, 70], [38, 66, 52], [72, 44, 60]]
      const AVG = (Math.max(...VAL.flat()) - Math.min(...VAL.flat())) / 2
      const comboRaw = BIGS.map((big, gi) => {
        const [v1, v2, v3] = VAL[gi]
        return { big, c1: v1, c2: v2, c3: v3, d1: v1, d2: v2, wv: AVG }
      })
      const nCol = COLS.length            // 6
      const BAR_N = 3                     // 每组 3 根柱

      const canvas = document.createElement('canvas')
      canvas.style.width = '100%'
      canvas.style.height = '100%'
      comboTopRef.value.appendChild(canvas)
      await new Tsukiyo(canvas)
        .input(comboRaw)
        .scale({ dimX: 'big', dimY: COLS })
        .coord('Bar')
        // 静态结构演示 — 跳过生长通道（虚线/波浪需满进度才可见）
        .anim('snap')
        .shape((el, p, i) => {
          const sub = i % nCol
          if (sub < BAR_N) return bar({ w: 14 }, colors[4])       // 柱
          if (sub < nCol - 1) return dash(colors[2])              // 组内短虚线
          return wave({ amp: 0.26 }, colors[3])                   // 组间波浪
        })
        .paths((el, i, m) => {
          const sub = i % nCol
          const g = Math.floor(i / nCol)
          // 柱不连（各自 closePath）
          if (sub < BAR_N) return { Δi: -1 }
          // 连线槽的 value 与源柱相同 → 它的锚点已经落在源柱顶，
          // 因此 Δ 只需「源锚点 → 目标锚点」的纯差值（linkBox 默认行为）。
          const hop = (a, b) => ({
            Δi: b,
            ΔfromP: [m.x[a] - m.x[i], m.y[a] - m.y[i]],
            ΔtoP: [0, 0],
            Δloop: false,
          })
          if (sub === BAR_N) return hop(g * nCol, g * nCol + 1)              // d1: c1 顶 → c2 顶
          if (sub === BAR_N + 1) return hop(g * nCol + 1, g * nCol + 2)      // d2: c2 顶 → c3 顶
          // 组间波浪 — 本组末柱 → 下一组首柱；两端钉在**全柱平均高度**（水平桥接）：
          // fromP 把起点 x 对齐末柱（y 保持本槽平均高度），toP 把终点抬到同一高度
          const from = g * nCol + (BAR_N - 1)
          const to = (g + 1) * nCol
          if (to >= m.count) return { Δi: -1 }

          return {
            Δi: to,
            ΔfromP: [m.x[from] - m.x[i], 0],
            ΔtoP: [0, m.y[i] - m.y[to]], // 终点to的Y坐标 偏移到 前一个起点的纵坐标, 保持水平连接 [由于设定是组间波浪线高度是最高柱+最低柱的平均值, 所以y[i]==AVG]
            Δloop: false,
          }
        })
        .draw()
    }

    // Bar 3D — WebGPU 世界系挤出（与 2D 版同数据链，仅 draw('3d')）
    {
      const canvas = document.createElement('canvas')
      canvas.style.width = '100%'
      canvas.style.height = '100%'
      bar3dRef.value.appendChild(canvas)
      await new Tsukiyo(canvas)
        .input([10, 80, 45, 120, 60])
        .coord('Bar')
        .shape((el, p, i) => Shapes.rect(30, colors[i % colors.length]))
        .draw('3d')
    }

    // Pie 3D — 扇段挤出为圆柱段（与 2D 版同数据链，仅 draw('3d')）
    {
      const canvas = document.createElement('canvas')
      canvas.style.width = '100%'
      canvas.style.height = '100%'
      pie3dRef.value.appendChild(canvas)
      await new Tsukiyo(canvas)
        .input([
          { name: 'A', val: 30 },
          { name: 'B', val: 45 },
          { name: 'C', val: 25 },
          { name: 'D', val: 70 },
          { name: 'E', val: 100 },
        ])
        .scale({ dimX: 'name', dimY: ['val'] })
        .coord({ x: Axis.cx, y: Axis.cy, grid: 'polar' })
        .shape((el, p, i) => Shapes.sector(60, colors[i % colors.length]))   // 扇段语法糖 — 角度按 value 比例分配
        .draw('3d')
    }

    // Mugen — 无限月读天幕（月亮 + 地平线 + 斑立绘 = 一个 paint 自绘层）
    {
      const canvas = document.createElement('canvas')
      canvas.style.width = '100%'
      canvas.style.height = '100%'
      mugenRef.value.appendChild(canvas)
      await new Tsukiyo(canvas)
        .input([42, 68, 35, 88, 52, 74])
        .coord('Bar')
        .shape((el, p, i) => Shapes.rect(30, rgba(255, 118, 100, 200)))
        .layering(() => ({ layers: [{ z: -1, paint: drawMugen }] }))
        .draw()
    }

    // Combo（「高度自定制」章节）— 四组柱 + 组内短虚线 + 组间双波浪（末组回绕）
    {
      // 圆角柱 — 锚点在柱顶，h>0 向下落到基线（与内置 rect 同向）
      const bar = Shapes.custom({
        kind: 'rect', fill: true, λDelay: 0,
        slots: { w: 20, k: 1 },
        geo: ({ w, h, k }, o) => {
          const r = Math.min(3 * k, w / 2, Math.abs(h) / 2)
          o.moveTo(-w / 2 + r, 0)
          o.lineTo(w / 2 - r, 0)
          o.quadraticCurveTo(w / 2, 0, w / 2, r)
          o.lineTo(w / 2, h - r)
          o.quadraticCurveTo(w / 2, h, w / 2 - r, h)
          o.lineTo(-w / 2 + r, h)
          o.quadraticCurveTo(-w / 2, h, -w / 2, h - r)
          o.lineTo(-w / 2, r)
          o.quadraticCurveTo(-w / 2, 0, -w / 2 + r, 0)
          o.closePath()
        },
      })
      // 组内短虚线
      const dash = Shapes.custom({
        kind: 'line', lineWidth: 1.2, dash: [3, 3], λDelay: 6,
        slots: {},
        geo: ({ w, h }, o) => { o.moveTo(0, 0); o.lineTo(w, h) },
      })
      // 组间双 〰️ 波浪 — 正弦多周期采样，两条平行轨道（法向恒定间距 gap）。
      // sin 在两端为 0 → 波浪端点精确落在锚点；波幅取绝对像素上限防长段鼓成巨弧。
      const AMP_PX = 10
      const wave = Shapes.custom({
        kind: 'line', lineWidth: 1.5, λDelay: 12,
        slots: { amp: 0.26, gap: 6, turns: 2 },
        geo: ({ w, h, amp, gap, turns }, o) => {
          const n = Math.hypot(w, h) || 1
          const [ux, uy] = [-h / n, w / n]
          const a = Math.min(n * amp, AMP_PX)
          const N = Math.max(8, Math.round(turns * 8))     // samples per track
          for (const s of [0, 1]) {
            const g = (s - 0.5) * gap                      // constant gap along the normal
            o.moveTo(ux * g, uy * g)                       // parallel tracks, same-phase wave
            for (let k = 1; k <= N; k++) {
              const t = k / N
              const off = Math.sin(t * turns * Math.PI * 2) * a + g
              o.lineTo(w * t + ux * off, h * t + uy * off)
            }
          }
        },
      })
      const BIGS = ['G1', 'G2', 'G3', 'G4']
      // 连线槽 value 复用源柱值 → 锚点落在柱顶；
      // wv 取全柱平均 → 组间桥接两端同高（水平连线，不贴柱顶）
      const COLS = ['c1', 'c2', 'c3', 'd1', 'd2', 'wv']
      const VAL = [[30, 55, 42], [62, 48, 70], [38, 66, 52], [72, 44, 60]]
      const AVG = (Math.max(...VAL.flat()) - Math.min(...VAL.flat())) / 2
      const comboRaw = BIGS.map((big, gi) => {
        const [v1, v2, v3] = VAL[gi]
        return { big, c1: v1, c2: v2, c3: v3, d1: v1, d2: v2, wv: AVG }
      })
      const nCol = COLS.length
      const BAR_N = 3
      const canvas = document.createElement('canvas')
      canvas.style.width = '100%'
      canvas.style.height = '100%'
      comboRef.value.appendChild(canvas)
      await new Tsukiyo(canvas)
        .input(comboRaw)
        .scale({ dimX: 'big', dimY: COLS })
        .coord('Bar')
        // 静态结构演示 — 跳过生长通道（虚线/波浪需满进度才可见）
        .anim('snap')
        .shape((el, p, i) => {
          const sub = i % nCol
          if (sub < BAR_N) return bar({ w: 14 }, colors[0])
          if (sub < nCol - 1) return dash(colors[3])
          return wave({ amp: 0.26 }, colors[3])
        })
        .paths((el, i, m) => {
          const sub = i % nCol
          const g = Math.floor(i / nCol)
          if (sub < BAR_N) return { Δi: -1 }
          // 连线槽 value 与源柱相同 → 锚点已在柱顶，Δ 只需纯差值
          const hop = (a, b) => ({
            Δi: b,
            ΔfromP: [m.x[a] - m.x[i], m.y[a] - m.y[i]],
            ΔtoP: [0, 0],
            Δloop: false,
          })
          if (sub === BAR_N) return hop(g * nCol, g * nCol + 1)
          if (sub === BAR_N + 1) return hop(g * nCol + 1, g * nCol + 2)
          // 组间波浪 — 末组无下一组，不桥接；两端钉在**全柱平均高度**（水平桥接）
          const from = g * nCol + (BAR_N - 1)
          const to = (g + 1) * nCol
          if (to >= m.count) return { Δi: -1 }
          return {
            Δi: to,
            ΔfromP: [m.x[from] - m.x[i], 0],
            ΔtoP: [0, m.y[i] - m.y[to]],
            Δloop: false,
          }
        })
        .draw()
    }
  })
</script>

<style>
/* @import '@k1/styles/tsukiyo.scss'; */
</style>
