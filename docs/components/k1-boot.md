## M9组件系列 K1风格 - 组件文档

**M9目标规划**

M9系列为纯个人学习提升的技能精进合集，顾名思义，我要打造一套属于自己前端的独孤九剑：

+ 第一剑：K1 - 组件库（大体设计完成，将会不断补充B端、C端通用组件）

+ 第二剑：K2 - 2D 数据可视化库（筹备中）

+ 第三剑：K3 - WebComponents 原生组件开发框架（待开展 - 实现真正的夸类库开发）

+ 第四剑：K4 - M9WebAdaptor 页面元素自适应布局嗅探器（筹备中 - 高度灵活可配的自适应布局器）

+ 第五剑：K5 - 简易的 nodejs 服务端框架（待开展 - 实现前端链上的自我前后端统一）

+ 第六剑：K6 - 简易的 K6Bundler 工程化构建工具（待开展 - K6型打包器）

+ 第七剑：K7 - 简易的 K7-Client 前端脚手架（待开展 - 将M9系列的K1 ~ K9 独孤九剑整合到K7脚手架中）

+ 第八剑：K8 - 简易的样式系统（待开展 - 都2024了，css属性规则还是乱成一锅粥，将来沉淀一下有关css属性集合，整合成类似 tailwind 的风格）

+ 第九剑：K9 - 对标开发界最热门流行的技术 ~ 人工智能（有生之年 - 将这一套整合转型成能够自动学习的前端智能框架）

---

**简介**

该组件库为 M9组件系列中 K1(浪漫主题)风格，风格样式均为自行设计。我并非专业 UI|UE 设计师，站点中相关风格均为慢慢调整出来的。支持双色风格，各位看官可以切换网页右上角明暗开关切换明暗模式。推荐暗黑模式观看（设计初衷就是奔着暗黑风格去的）

---

**工具栈**

既然是组件库轮子项目，本人竭力不借助第三方工具库，尽力将各通用功能封装到位。目前站点及m9组件库中，使用的三方依赖涉及如下：
  1. "classnames": "^2.3.1", - <样式类名拼装器>
  2. "core-js": "^3.6.5", - <库中可能涉及到一些es代码兼容或补丁，靠core-js打补丁>
  3. "dayjs": "^1.11.5", - <时间处理器> [开发时间选择器时使用]
  4. "vue": "^3.2.25" - <vue3.x 框架>
  5. "sass": "^1.54.3", - <sass 预处理器>
  6. "typescript": "^4.0.0", - <ts 类型提示器>
  7. "vite": "^4.0.0", - <vite 工程化构建器>
  8. "vitepress": "^1.0.0-rc.44" - <vitepress 静态文档站点生成器>

---

**目的**

本人日常工作和学习中，遇到的大大小小问题的整合统一，开发对应组件统一集成处理，沉淀出自己的组件优势，摆脱对市面上流行库的依赖。PS（市面上的 AntD、ElementUI，个人认为封装的组件功能大而杂，且部分render元素结构极不合理，经常多层div的嵌套，页面元素莫名增多，比如table表格组件，为了实现冻结列功能，最后他们有些版本渲染出的元素竟然是三个 table元素相连的，我看着就头大。。。）
m9系列组件，意在突破市面流行库的桎梏，真正集成一些小而精的为我所用的高度封装组件。

---

**通用能力**

K1风格中，内部高度集成了一些通用功能组件：
1. 元素点击的涟漪波纹效果
2. 元素拖拽效果（上下左右边框拉伸也可主动控制，在 Modal弹框和 TableHeader 组件中有实际应用）
3. 弹跳动画（气泡元素中有应用）
4. 防抖节流（虚拟滚动时有实际应用）
5. 虚拟滚动（只要涉及到大数据渲染的组件，我全部集成了自己的虚拟滚动能力，主要体现在 下拉框、表格组件中）

```bash
// * 虚拟滚动
interface M9VScrollProps {
  // ? 虚拟化时 - 待滚动的目标窗口元素, 函数包裹<调用时才返回, 防止有时会出现元素还没渲染到节点上的异步渲染问题>
  vsElement: () => HTMLElement
  // ? 虚拟化时 - 窗口滚动样式设置
  vsStyle: { x: number, h: number }
  // ? 虚拟滚动的单元高度
  vsUnitHeight: number
  // ? 被虚拟化的原始数据
  data: Array<any>
}
interface M9VScrollState {
  // ? 虚拟化时 - 上极限索引坐标
  topIndex: number
  // ? 虚拟化时 - 下极限索引坐标
  bottomIndex: number
}
// ? 虚拟化时 - 通过上下极限 - 截取的局部数据片段
type M9VSDataT = Array<any>

interface M9VSWindowProps {
  // ? 虚拟化 - 可视窗口宽度
  width: number
  // ? 虚拟化 - 可视窗口高度
  height: number
  // ? 虚拟化 - 可视窗口内 - 单元高度
  unitHeight: number
  // ? 虚拟化 - 可视窗口上下两边留出的多余数据数量 <防止滚动过快出现的上下留白情况, 避免造成不流畅的观感体验>
  restViewLength: number;
  // ? 虚拟化 - 可视窗口最大能承载的数据数量
  dataViewLength: number
  // ? 虚拟化 - 可视窗口对应的 子元素DOM节点本身记录
  __viewportEl: HTMLElement | null,
  // ? 虚拟化 - 全部内容窗口对应的 子元素DOM节点本身记录
  __contentEl: HTMLElement | null
}
```

---

**优势**

+ 小而精的代码，清晰合理的模块化设计（属于编码规范的管控，这个真的很重要。工欲善其事必先利其器，合理的组织css、拆分大功能、封装小功能，合理的生命周期控制。这里我说的生命周期属于软件工程的那种，要对每一个模块、每一个函数、每一个对象、每一个数组都要尽力做到精细控制，有创建、就有销毁，谁都不例外。养成好习惯，当数组、Map、或一个对象实例使用完毕后，手动置空 null，帮助浏览器立即进行垃圾回收，后续可能就会避开很多性能问题。只有将这些小事项处理好了，那么打造的摩天大楼根基才会稳定）
+ 精细的性能体验，比如 单实例控制 dragHelper提示线，虚拟滚动及防抖节流，都在节省渲染性能开销
```bash
  // ? 单例模式 - 全系统仅提供一个 拖拽-helper 提示线元素, 最大程度节省性能

  function M9DragHelperCtor () {
    // ! 闭包定义变量名 - 防止全部变量污染
    var one_m9DragHelper
    return (props, helper_div_root: HTMLDivElement = document.createElement('div')) => one_m9DragHelper = one_m9DragHelper || createApp(M9DragHelperComponent, {
      root: helper_div_root,
      direction: props.direction
    }).mount(helper_div_root)
  }
  export default M9DragHelperCtor()
```
+ select 选择框旁边的小南瓜头，是 webComponents 原生组件设计的，未来对原生组件的设计开发，可能会放到我后续的 K2风格中（目前还处于规划阶段，K2风格未开展）用原生真正实现跨类库开发

---

**不足**

1. 待补充一个 CardTabs 选项滑动卡片 组件，后续完善
2. 我发现有时vue组件莫名其妙连续渲染多次，后边考虑实现类似 react-hook 中的 useMemo、useCallback 实现对组件渲染的缓存，将渲染性能优化到极致（只在对应的 deps中 响应式数据变化才响应，不变化不响应）
3. 后续可能会设计一套简易的全局状态管理库 SeerX
4. 表单后续可能会向自动化动态表单转型（其实目前内部的这个表单模型，内部渲染表单的方式就是个低配版的低代码方式，纯纯的是利用用户输入的各种表单项的配置对象进行各表单项的组件渲染）
```bash
// * 表单单元域控件 生成器
const RenderFieldItem = function RenderFieldItem<FKEYS2>(
  _ctx: SetupContext,
  FieldOptions: M9ZzFieldT<FKEYS2>,
  zv$:  M9ZzFormHooksT<FKEYS2>['zv$'],
  isSubmitted: M9InvalidT extends Ref<infer B> ? B : boolean
) {
  const { key: FieldName, type, label, required, _class } = FieldOptions

  const FieldZV$ = zv$[FieldName].value

  let asyncFieldComponent = null

  if (type === 'IPT') {
    asyncFieldComponent = InputUI<FKEYS2>(_ctx, FieldOptions, FieldZV$, isSubmitted)
  } else if (type === 'SLT') {
    asyncFieldComponent = SelectUI<FKEYS2>(_ctx, FieldOptions, FieldZV$, isSubmitted)
  } else if (type === 'SWITCH') {
    asyncFieldComponent = SwitcherUI<FKEYS2>(_ctx, FieldOptions, FieldZV$, isSubmitted)
  } else if (type === 'TIME') {
    asyncFieldComponent = DateUI<FKEYS2>(_ctx, FieldOptions, FieldZV$, isSubmitted)
  } else if (type === 'FILE') {
    // asyncFieldComponent = FilerUI<FKEYS2>(_ctx, FieldOptions, FieldZV$, isSubmitted)
  } else if (type === 'CBOX-G') {
    asyncFieldComponent = CheckboxGroupUI<FKEYS2>(_ctx, FieldOptions, FieldZV$, isSubmitted)
  }

  const __class0 = `
    lg:col-${type === 'CBOX-G' ? '12' : '4'}
    md:col-${type === 'CBOX-G' ? '12' : '6'}
    sm:col-${type === 'CBOX-G' ? '12' : '12'}
  `

  const isError = FieldZV$.$invalid && isSubmitted

  const _errorFieldcls = classNames({ 'm9-field__required--invalid': isError })

  return asyncFieldComponent
    && (
      <div className={`m9-field ${!!_class ? _class : __class0} ${_errorFieldcls}`}>
        <h4 className='m9-field__label'>
          {label} {required && <span className='zz-dot'>*</span>}
        </h4>
        <div className="m9-field__component">
          {asyncFieldComponent}
        </div>
        { isError && <small className='m9-field__required--message'>{FieldZV$.$message}</small> }
      </div>
    ) || null
}
```
5. 表格的在线编辑能力

---

**展望**

m9系列组件库，未来会着重两点：响应式 + 可视化:
  1. 我对可视化极有兴趣，K1风格中，现在已经实现了一个简易柱状图和一个简易饼状图，未来在K1风格的可视化天下中，再集成出 贝塞尔折线图、组合柱状图、雷达图、外加我自己的 可视化高性能抽取引擎（类似于虚拟渲染，只可视化可视的部分~QAQ~).
  ![柱状图示例](/public/pie.png)
  ![饼图示例](/public/bar.png)
  2. 响应式 - 大多数库和中小型网站（国内），好像对网页响应式处理上都不够精细。
  在我的 K1风格库中，有一套简易的响应式处理器（M9Adaptor）。大概工作流程是：
  + 将该组件包裹在任意位置，组件会在 onMounted 周期内，开启对响应式元素的嗅探
  + 检测元素上的标记 "m9-web-dom" 这个属性，我的嗅探器就会认定他是个待响应布局的元素，然后解析对应的响应布局属性：
  ```bash
  <div className={`${preCls}--filelist`} m9-web-dom="::document => md -> display: flex;flex-wrap: wrap;max-height: 10rem">
  ```

  那么我的嗅探器将会开启正则编译，将关键信息提取出来，上述表达含义翻译成人话就是：
  + 我是一个html元素，我需要根据 id="m9-pid" 这个元素的尺寸而变化自身布局
  + 当 m9-pid 元素尺寸变成 lg 大号时，我本身的布局样式会变成 "display:inline-block 900; width: 500px; height : 200px"
  + 当 m9-pid 元素尺寸变成 md 中号时，我本身的布局样式会变成 "width :100px"
  + 当 m9-pid 元素尺寸变成 sm 中号时，我本身的布局样式会变成 "opacity: 0.5"

  ---

  目前该元素响应式嗅探布局器，还待完善，目前可以使用，但有明显缺陷：
  + 利用 MutationObserve API 实时监听目标响应元素的 style 变化，进而响应布局那些关联元素。
  + 元素自身的 style 不变，但尺寸发生变化时，MutationObserve 无法监听响应。

  ---

  PS（后边我有注意到还有一个API，叫做 ResizeObserve API，这个可能才是那个正儿八经的实时监听元素尺寸变化的那个功能，但是使用很诡异，网上说的方式实例化一个 resizeObserve 时，在构造函数中，创造一个 类似 requestAnimationFrame 的轮询定时器，不断执行尺寸变化后的动作。但是这个我感觉不好控制，而且实现方式不好。我本人是代码洁癖，所以未来我要自己找一个合适的方案，将k1嗅探器打造成一个真正的响应式嗅探器）