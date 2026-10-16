## Tsukiyo 图表

Tsukiyo（月读）是极简 2D 可视化库，采用链式 API：`input → point → coord → paths → draw`。v1.1 新增 WebGPU 3D 后端 — 同一链式 API，`.draw('3d')` 即可 3D 渲染。

**执行流职责：**
- `point` — 图形定型器：选择原语类型 + 固定几何参数（支持自定义 hook）
- `coord` — 图形定位器：坐标系选取 + 位置定位（写目标几何，不感知动画）
- `paths` — 图形路径封闭器：跨元素 Δ 组装 + 路径封闭（写目标偏移，支持自定义 hook）
- `layering` — 布局器 + anim 推进（唯一写入点）：网格背景 + 脏区域收集 + 空间索引更新 + 视椎剔除 + anim 步进
- `draw` — 渲染器（纯读取）：绘制 + anim 缩放消费（按原语锚点缩放，不推进 anim）


图表类型 = 坐标系规则 + 图形映射的组合，不是独立类。

### 柱状图（Bar）

**示例**

<div style="display:flex;gap:16px">
  <div ref="barRef" class="tsukiyo-chart" style="flex:1;height:200px"></div>
  <div ref="barGroupRef" class="tsukiyo-chart" style="flex:1;height:200px"></div>
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
      .point((el, p, i) => Shapes.rectC(30, 0, rgba(100, 149, 237, 200)))
      .draw()
  })
</script>
```

> **数据流说明**：`point` 阶段声明原语类型 + 固定几何参数（如柱宽 `30`），`h=0` 为占位值。柱高由 `coord` 阶段根据 `el.value`（SoA `value[]`）经 `mapRange(value, valueMin, valueMax, 0, viewHeight)` 计算后覆写。

**代码 — 多组柱状图（paths 自定义分组定位）**

```html
<template>
  <div ref="barGroupRef" style="width:100%;height:200px"></div>
</template>

<script setup>
  import { getCurrentInstance, onMounted, ref } from 'vue'
  const { proxy } = getCurrentInstance()
  const { $K1TsukiyoX: Tsukiyo, $K1ShapesX: Shapes, $K1RgbaX: rgba, $K1PrimX: Prim } = proxy

  const barGroupRef = ref()

  // groupBarCoord — custom locator: project each bar to its column center,
  // then shift horizontally by its dimY group index (in-column grouping)
  const groupBarCoord = ({ width, dimYCount }) => ({
    x: {
      kind: 'cat',
      at: (el, dimX, dimY, ctx) => {
        const cols = ctx.dimXCount
        const colW = ctx.width / cols
        const barW = 14
        const step = barW + 4
        const halfSpan = (dimYCount - 1) * step / 2
        return dimX * colW + colW / 2 + (dimY * step - halfSpan) - barW / 2
      },
    },
    y: { kind: 'num', at: (el, dX, dY, ctx) => {
      const normalized = (el.value - ctx.valueMin) / (ctx.valueMax - ctx.valueMin || 1) * ctx.height
      return ctx.height - normalized
    } },
    grid: 'cartesian',
  })


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
      .coord(groupBarCoord)
      .point((el, p, i) => {
        const cols = 3
        const colors = [
          rgba(100, 149, 237, 200),
          rgba(255, 99, 71, 200),
          rgba(60, 179, 113, 200),
        ]
        return Shapes.rectC(14, 0, colors[Math.floor(i / cols) % colors.length])
      })
      .draw()
  })
</script>
```

> **分组柱说明**：`coord(groupBarCoord)` 自定义定位器 — x 轴投影按列中心 + `dimY` 组索引做列内水平偏移，一步实现三组并列（分组定位本属 coord 职责）。coord 工厂函数接收 `({ width, height, dimYCount })`，返回完整 locator（x/y 轴投影 + grid 族标记）。


### 散点图（Point）

散点图 = `Axis.xy()` 组合子（双数值连续轴）+ `point(circle)` 原语映射的组合 — 无需内置图表类型。

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
  const { $K1TsukiyoX: Tsukiyo, $K1ShapesX: Shapes, $K1RgbaX: rgba, $K1AxisX: Axis } = proxy

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
      .input([10, 80, 45, 120, 60])       // std 快路径 → (index, value) × 5
      .coord(Axis.xy())                   // 双数值连续轴 — 散点定位器
      .point((el, p, i) => Shapes.circle(10, colors[i % colors.length]))
      .draw()
  })
</script>
```

### 折线图（Line）

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
      .coord('Line')
      .point((el, p, i) => [
        Shapes.line(rgba(255, 99, 71, 255)),
        Shapes.curve(rgba(100, 149, 237, 180)),
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
  const { $K1TsukiyoX: Tsukiyo, $K1ShapesX: Shapes, $K1RgbaX: rgba, $K1PrimX: Prim } = proxy

  const sineRef = ref()

  // ringSeal — paths seal callback: each curve links to the next point and
  // the tail wraps around to the head, forming a closed smooth ring
  const ringSeal = (el, i, model) => ({ Δi: (i + 1) % model.count })

  onMounted(async () => {
    const canvas = document.createElement('canvas')
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    sineRef.value.appendChild(canvas)

    // 同数据源 — 与基础折线图相同的输入，仅通过 paths seal 改变展示形式
    await new Tsukiyo(canvas)
      .input([10, 80, 45, 120, 60])
      .coord('Line')
      .point((el, p, i) => Shapes.curve(rgba(100, 149, 237, 220)))
      .paths(ringSeal)
      .draw()
  })
</script>
```

> **paths seal 说明**：与基础折线图相同的 `input` + `coord('Line')`，仅通过 `.paths(ringSeal)` 改变展示形式。`.paths()` 不传时内置 defaultSeal（`{Δi: i+1}`，末点断开开放折线），`ringSeal` 用 `(i+1) % n` 模运算让末点回绕首点，形成封闭平滑曲线 — 体现 paths 跨图形封闭规则的可配置能力。


### 饼图（Pie）


**示例**

<div ref="pieRef" class="tsukiyo-chart" style="width:100%;height:200px"></div>

**代码**

```html
<template>
  <div ref="pieRef" style="width:100%;height:200px"></div>
</template>

<script setup>
  import { getCurrentInstance, onMounted, ref } from 'vue'
  const { proxy } = getCurrentInstance()
  const { $K1TsukiyoX: Tsukiyo, $K1ShapesX: Shapes, $K1RgbaX: rgba } = proxy

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
      .coord('polar')
      .point((el, p, i) => Shapes.sector(60, colors[i % colors.length]))   // 扇段语法糖 — 角度按 value 比例分配
      .draw()
  })
</script>

```

### 雷达图（Radar）

雷达图使用 `coord('radar')` + `point(triangle)` 组合。`dimX` 为系列（每个三角形切片属于一个系列），`dimY` 为维度（雷达图的辐射轴）。`paths` 执行流自动组装三角扇（圆心 + 相邻维度顶点），形成完整多边形填充，hover 时单个切片径向外凸高亮。


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
  const { $K1TsukiyoX: Tsukiyo, $K1ShapesX: Shapes, $K1RgbaX: rgba } = proxy

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
      .coord('radar')
      .point((el, p, i) => {
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

`.draw('3d')` 启用 WebGPU 3D 后端 — 世界系 = 2D 屏幕系 + Y 翻转 + Z 挤出。数据链（`input → coord → point`）与 2D 完全一致，仅切换 `draw` 参数。WebGPU 不可用或初始化失败时自动回退 Canvas2D。

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
      .point((el, p, i) => Shapes.rectC(30, 0, rgba(100, 149, 237, 255)))
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
  const { $K1TsukiyoX: Tsukiyo, $K1ShapesX: Shapes, $K1RgbaX: rgba } = proxy

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
      .coord('polar')
      .point((el, p, i) => Shapes.sector(60, rgba(100, 149, 237, 255)))   // 扇段语法糖 — 角度按 value 比例分配
      .draw('3d')
  })
</script>
```

> **v1 边界**：支持 Rect（盒体）/ Line（薄旋转盒）/ Arc（圆柱扇段）；Text/Curve/Triangle/Circle 未注册 3D 材料 → 静默跳过；不开混合（fill 的 alpha 被忽略）；柱体厚度/光照/视角由 `C3D` 常量统一配置。

## API


| 方法     | 说明                              | 参数                          | 返回   |
| -------- | --------------------------------- | ----------------------------- | -------- |
| input    | 输入阶段 - 原始数据接收器        | `(raw: any[])` | `this` |
| scale    | 测绘阶段 - 图形维度划分器        | `(dim: DimConf)` | `this` |
| coord    | 图形定位器 - 坐标系选取+位置定位；内置名（Bar/Line/polar/radar）= 预制组合，`Axis.xy()` 等组合子可自由组装 | `(rule: string \| ITsukiyoLocator \| fn)` | `this` |
| point    | 图形定型器 - 原语类型选择+固定几何参数 | `(fn: PointFn)` | `this`   |
| paths    | 图形路径封闭器 - 跨图形Δ连接（seal 回调：`{Δi, ΔfromP?, ΔtoP?}`）；不传 = defaultSeal（`{Δi: i+1}` 折线紧密连接） | `(fn?: SealFn)` | `this` |
| draw     | 输出阶段 - 图形渲染绘制器（2D Canvas / 3D WebGPU） | `(mode?: '2d' \| '3d')`，默认 `'2d'`；`'3d'` 时 WebGPU 不可用自动回退 | `Engine` |

<script setup>
  import { getCurrentInstance, onMounted, ref } from 'vue'
  const { proxy } = getCurrentInstance()
  const { $K1TsukiyoX: Tsukiyo, $K1ShapesX: Shapes, $K1RgbaX: rgba, $K1PrimX: Prim, $K1AxisX: Axis } = proxy

  const pointRef = ref()
  const barRef = ref()
  const barGroupRef = ref()
  const line0Ref = ref()
  const line1Ref = ref()
  const sineRef = ref()
  const pieRef = ref()
  const radarRef = ref()
  const bar3dRef = ref()
  const pie3dRef = ref()

  const colors = [
    rgba(100, 149, 237, 220),
    rgba(255, 99, 71, 220),
    rgba(60, 179, 113, 220),
    rgba(255, 165, 0, 220),
    rgba(138, 43, 226, 220)
  ]

  // groupBarCoord — custom locator: column center + dimY in-column offset
  const groupBarCoord = ({ dimYCount }) => ({
    x: {
      kind: 'cat',
      at: (el, dimX, dimY, ctx) => {
        const colW = ctx.width / ctx.dimXCount
        const barW = 14
        const step = barW + 4
        const halfSpan = (dimYCount - 1) * step / 2
        return dimX * colW + colW / 2 + (dimY * step - halfSpan) - barW / 2
      },
    },
    y: { kind: 'num', at: (el, dX, dY, ctx) => {
      const normalized = (el.value - ctx.valueMin) / (ctx.valueMax - ctx.valueMin || 1) * ctx.height
      return ctx.height - normalized
    } },
    grid: 'cartesian',
  })

  // ringSeal — paths seal callback: chain each curve to the next point and
  // wrap the tail around to the head (closed smooth ring)
  const ringSeal = (el, i, model) => ({ Δi: (i + 1) % model.count })

  onMounted(async () => {
    // Point — 散点图（Axis.xy() 双数值连续轴 + circle 原语）
    {
      const canvas = document.createElement('canvas')
      canvas.style.width = '100%'
      canvas.style.height = '100%'
      pointRef.value.appendChild(canvas)
      await new Tsukiyo(canvas)
        .input([10, 80, 45, 120, 60])
        .coord(Axis.xy())
        .point((el, p, i) => Shapes.circle(10, colors[i % colors.length]))
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
        .point((el, p, i) => Shapes.rectC(30, 0, colors[i % colors.length]))
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
        .coord(groupBarCoord)
        .point((el, p, i) => Shapes.rectC(14, 0, colors[Math.floor(i / 3) % colors.length]))
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
        .coord('Line')
        .point((el, p, i) => Shapes.line(colors[0]))
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
        .coord('Line')
        .point((el, p, i) => [
          Shapes.line(colors[1]),
          Shapes.curve(colors[0]),
        ])
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
        .coord('Line')
        .point((el, p, i) => Shapes.curve(colors[0]))
        .paths(ringSeal)
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
        .coord('polar')
        .point((el, p, i) => Shapes.sector(60, colors[i % colors.length]))   // 扇段语法糖 — 角度按 value 比例分配
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
        .coord('radar')
        .point((el, p, i) => {
          // 按系列着色 — 每个系列（5 个维度切片）同色，Math.floor(i/5) 区分系列
          return Shapes.triangle(colors[Math.floor(i / 5) % colors.length])
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
        .point((el, p, i) => Shapes.rectC(30, 0, colors[i % colors.length]))
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
        .coord('polar')
        .point((el, p, i) => Shapes.sector(60, colors[i % colors.length]))   // 扇段语法糖 — 角度按 value 比例分配
        .draw('3d')
    }
  })
</script>

<style>
/* @import '@k1/styles/tsukiyo.scss'; */
</style>
