import MTrans from '../Transtions'

import { __on, __off, MThrottle, HangRoot } from '../M9-Utils'
import classNames from 'classnames'
import { Ref, VNode, defineComponent, getCurrentInstance, h, nextTick, onBeforeMount, onMounted, onUnmounted, reactive, ref, watch } from 'vue'

const Bound = MTrans.Bound

export interface MPopoverProps {
  /**
   * @description 气泡框 悬浮位置 [字符类型] <默认为上侧>
   */
  position?: string /** @see <|top<|-|>down<|-|>left<|-|>right<| */

  /**
   * @description 气泡框 悬浮开启模式 [字符类型] <默认为点击开启-点击关闭>
   */
  popMode?: string /** @see <|MP0PClick<|-|>MP0PHover<| */

  /**
   *  @description 气泡框 指定 - <元素的父节点> [默认 document 文档]
   */
  parentNodeSetter?: (elementNode?: Node | null) => Element

  /**
   * @description 气泡框 外部容器控制开关 [布尔类型] <必选>
   */
  showPop: boolean /** @see <|true-|==|-false|> */

  /**
   * @description 气泡框 内部容器内容 [React元素] <必选>
   */
  content: VNode

  /**
   * @description 气泡消失时执行的回调
   */
  onUnP0P?: () => void
}

interface MPopoverState {
  M5howP0P: boolean

  P0P5tyle: object
}

type Event4andlerFnType = (el: Element | Text | Document, ev: string, _handler: EventListenerOrEventListenerObject) => void

export default defineComponent({
  name: 'M9Popover',
  props: {
    showPop: {
      type: Boolean,
      default: false
    },
    position: {
      type: String,
      default: 'top'
    },
    popMode: {
      type: String,
      default: 'click'
    },
    onUnP0P: {
      type: Function,
      default: () => void 0
    },
    parentNodeSetter: {
      type: Function,
      default: (elementNode?: Node | null) => document // ! elementNode || document
    }
  },
  setup (props, ctx) {
    const vm = getCurrentInstance()
    const PopRef: Ref<any> = ref(null)
    const R7arReference: Ref<any> = ref(null)
    let epop$Mode = "click"
    let _4andlerBuffers: any = []
    let pop3rRenderFLAG = false // * 气泡框 P0P3r是否渲染标志 [React元素] <必选>

    const state: { M5howP0P: boolean; P0P5tyle: { left: number; top: number } } = reactive({
      M5howP0P: false,
      P0P5tyle: { left: 0, top: 0 }
    })

    // !判断气泡框的显隐-是否受控
    function _U$isControlled() {
      const is = !!props.showPop

      return is
    }
    // 获取气泡框中.--.气泡El
    function _Get$Poper() {
      return PopRef.value?.$el || PopRef.value
    }
    // 获取气泡框中.--.指引者<先驱>El
    function _Get$Refer() {
      return R7arReference.value?.$el || R7arReference.value
    }
    // 获取气泡框中.--.气泡框元素本身El
    function _Get$t4isEl() {
      return  vm?.vnode.el // ReactDOM.findDOMNode(this)
    }
    // 获取当前组件元素.--.父元素El
    function _Get$ParentEl() {
      const $el = _Get$t4isEl()
      const firstParent = $el?.parentNode
      const { parentNodeSetter } = props
      return (parentNodeSetter && parentNodeSetter(firstParent))
    }
    // * 判断当前鼠标点击区域-是否为气泡框内部有效区域
    function isValidArea(e: Event) {
      const _$refer = _Get$Refer()
      const _$poper = _Get$Poper()
      const _$t4isEL = _Get$t4isEl()
      const _$target = e.target as Node
      const is =
        !_$t4isEL ||
        _$t4isEL.contains(_$target) ||
        !_$refer ||
        _$refer.contains(_$target) ||
        !_$poper ||
        _$poper.contains(_$poper)
  
      return is
    }
    // 设置气泡框弹出时, 在文档界面中的上左位置偏移量
    function setMP0P$Pos() {
      // ! (pop3r! /** @see this, */ /** @see this.refs.popper*/)
      const Refer$Rect = _Get$Refer()!.getBoundingClientRect()
      const P0P3r$Rect = _Get$Poper()!.getBoundingClientRect()
      const offsetY = window.scrollY
  
      const pop$style = { left: 0, top: 0 }

      const gapSize = 5 // ? 气泡与指引元素间的缝隙距离
      const absWidthDiff = Math.abs(Refer$Rect.width - P0P3r$Rect.width)
      const absHeightDiff = Math.abs(Refer$Rect.height - P0P3r$Rect.height)
  
      const gen_position_factory: { [key: string]: Function } = {
        top: () => {
          return { left: Refer$Rect.left - absWidthDiff / 2, top: offsetY + Refer$Rect.top - P0P3r$Rect.height - gapSize }
        },
        down: () => {
          return { left: Refer$Rect.left - absWidthDiff / 2, top: offsetY + Refer$Rect.bottom + gapSize }
        },
        left: () => {
          return { left: Refer$Rect.left - P0P3r$Rect.width - gapSize, top: offsetY + Refer$Rect.top - absHeightDiff / 2 }
        },
        right: () => {
          return { left: Refer$Rect.right + gapSize, top: offsetY + Refer$Rect.top - absHeightDiff / 2 }
        }
      }
      const Make$Po5 = gen_position_factory[props.position || 'top']()
      
      pop$style.left = Make$Po5.left
      pop$style.top = Make$Po5.top

      state.P0P5tyle = pop$style
    }
    // 节流 - 滚动事件发生时执行一些回调
    function ThrottleScroll2SetPos(_call_: Function, _delay_: number): EventListenerOrEventListenerObject {
      return MThrottle(_call_, _delay_)
    }
    // 在先驱者元素上 - 添加事件句柄 -> 为了在没有渲染出 poper 气泡框的时候, 组件内部由先驱者引出
    function handleEventHooksOnReferer() {
      const refererElement = _Get$Refer()!
      if (epop$Mode === 'click') {
        // 点击指引者元素__~~'not'__开关取反
        EvCollecter(refererElement, 'click', $blur$moving_2_O9en) // this.Reverse$P0P5how
      } else {
        // 移向指引者->启动开关<-
        EvCollecter(refererElement, 'mouseenter', $blur$moving_2_O9en)
        // 移出指引者->禁闭开关<-
        EvCollecter(refererElement, 'mouseleave', $blur$moving_2_C1ose)
      }
    }
    // ! 副作用 - 当气泡被渲染出来时, 此时一定是先驱者与气泡同时存在 | 我们要监听点击当前容器_[包含::气泡 + 先驱_]之外的区域后, 要关闭气泡
    function _E$effectNotAreaEvent() {
      const parentNode = _Get$ParentEl()
      EvCollecter(parentNode, 'click', $4OT3lAreaWrapper)
    }
    // ! 销毁副作用 - 移除外部区域监听器
    function _ReE$effectNotAreaEvent() {
      const parentNode = _Get$ParentEl()
      _4andlerBuffers.forEach((_4andler) => {
        _4andler.el === parentNode && __off(_4andler.el, _4andler.ev, _4andler.handler)
      })

      _4andlerBuffers = _4andlerBuffers.filter((_4andler) => _4andler.el !== parentNode)
    }
    // 元素的事件绑定器
    function EvCollecter(el: Element | Text | Document, ev: string, _handler: EventListenerOrEventListenerObject) {
      __on(el, ev, _handler)
  
      const E1istener0bj = {
        el,
        ev,
        handler: _handler
      }
      _4andlerBuffers.push(E1istener0bj)
    }
    // 当点击有效区域以外的地方后, 进行气泡框关闭操作
    function $4OT3lAreaWrapper(parentNodeEvent: Event) {
      const pop3r = _Get$Poper()!
      const ref3r = _Get$Refer()!
      $4OT3lArea([pop3r as Element, ref3r as Element], parentNodeEvent, $blur$moving_2_C1ose)
    }
    /**
     * @decription |> 点击无效区域后 ~~ 关闭并销毁气泡 <|
     * @function $4OT3lArea
     * @param {Element} _0ri$el @param {Event} _7ar$ev <|-|> @param {Function} _0nCall_
     */
    function $4OT3lArea(_0ri$el: Element | Element[], _7ar$ev: Event, _0nCall_: Function) {
      if (Array.isArray(_0ri$el)) {
        if (_0ri$el.every((el) => !el.contains(_7ar$ev.target as Node))) {
          _0nCall_ && _0nCall_()
        }
      } else {
        if (!_0ri$el.contains(_7ar$ev.target as Node)) {
          // 若当前0ri$el中没有7ar$el区域,则当前事件发生在预期0ri$el区域之外|>触发__callFn__
          _0nCall_ && _0nCall_()
        }
      }
    }
    // 指引者元素 点击事件 -> 开关不断取反
    function Reverse$P0P5how() {
      state.M5howP0P = !state.M5howP0P
    }
    // 鼠标移入模式开启时, 移入到指引者上方时, 开启气泡者
    function $blur$moving_2_O9en(e) {
      state.M5howP0P = true
    }
    // 鼠标移入模式开启时, 从指引者上方移出时, 关闭气泡者
    function $blur$moving_2_C1ose() {
      state.M5howP0P = false
      nextTick(() => {
        const { onUnP0P } = props
        onUnP0P && onUnP0P()
      })
    }
    // 气泡者组件销毁时, 自动移除与之相关联的事件绑定
    function _destoryEvInUnmountFade() {
      const poper = _Get$Poper()!
      _4andlerBuffers.forEach((_4andler) => {
        (_4andler.el === poper) && __off(_4andler.el, _4andler.ev, _4andler.handler)
      })
      
      _4andlerBuffers = _4andlerBuffers.filter((_4andler) => _4andler.el !== poper)
    }
    function _killEvListeners () {
      for (let i in _4andlerBuffers) {
        const _handler = _4andlerBuffers[i]
        __off(_handler.el, _handler.ev, _handler.handler)
      }
      _4andlerBuffers.length = 0
    }
    // 气泡者组件创建时, 自动绑定相关事件
    function _createEvOnMountFade() {
      const poper = _Get$Poper()!
      if (props.popMode === 'hover' && _4andlerBuffers.findIndex((_z) => _z.el === poper) < 0) {
        // 美九.P0P3r.气泡移入(<|~^~<|)
        EvCollecter(poper, 'mouseenter', $blur$moving_2_O9en)
        // 美九.P0P3r.气泡移出(<|^~^<|)
        EvCollecter(poper, 'mouseleave', $blur$moving_2_C1ose)
      }
    }
    // 
    function _run2RenderPop3r() {
      // ! 如果 气泡渲染标志为 false, 说明在此刻之前, 气泡的开关从未打开过, 气泡还未在DOM文档结构树中
      if (!pop3rRenderFLAG) {
        pop3rRenderFLAG = true
        _createEvOnMountFade()
        // 有效区域之外__关闭气泡框
        _E$effectNotAreaEvent()
      }

      // 如果 气泡渲染标志为 true, 说明气泡已经渲染在DOM中了, 相关的事件监听器也已经存在, 无需重复添加 $Ev_Handler
      // 在 Vue3 里调试发现, 代码执行到这里, 气泡元素被包裹的那个 Bound 弹跳动画元素干扰了, Bound动画周期没执行完,
      // 它里边的气泡元素 getBoundingClientRect 取值有问题都是 0, 故此处的 setMP0P$Pos 由Bound组件回调通知调用, 最合适
      // 如果在 react 中处理, 这个属于组件间通信, 可能略微小繁琐, 后边研究下怎么在react中处理 setMP0P$Pos()

      return 1
    }
    // 开关关闭后, 销毁 - 气泡元素 及其相关属性
    function _unRenderPop3r() {
      pop3rRenderFLAG = false
      _destoryEvInUnmountFade()
      // todo 2._
      _ReE$effectNotAreaEvent()

      return 0
    }

    watch([
      () => props.showPop,
      () => state.M5howP0P,
      () => props.position
    ], ([
      newShowPop,
      newM5howP0P, 
      newPosition
    ]) => {
      (newShowPop || newM5howP0P && _run2RenderPop3r()) || _unRenderPop3r()
    })

    onBeforeMount(() => {
      const { popMode } = props
      epop$Mode = !popMode ? 'click' : popMode
    })

    onMounted(() => {
      /** @see 获取外部指引器|>|>先驱者元素Ref引用 */
  
      // ! 断空卫语句
      if (!R7arReference.value) return
  
      /*
       * 1)._如果先驱者元素存在
       * 2)._气泡组件不受控制
       * 3)._直接先添加 - 先驱者元素 上边的开关取反事件句柄
       */
      const isNotController = !_U$isControlled()
      if (isNotController) { handleEventHooksOnReferer() }
  
      // ! 断空卫语句
      if (!PopRef.value) return
  
      /*
       * 1)._如果气泡元素存在
       * 2)._开启气泡的渲染事件
       */
      _run2RenderPop3r()
    })

    onUnmounted(() => {
      // ! 气泡渲染标志 - 重置为 false
      pop3rRenderFLAG = false
      // this.reference.parentNode.replaceChild(this.reference.cloneNode(true), this.reference);
      _killEvListeners()
      // this.setState = (state, callback) => void 0
      // __off(/** @see this.PopRef */ document, this.epop$Mode, this.$blur$click_2_C1ose.bind(this));
    })

    return {
      state,
      PopRef, R7arReference,
  
      isValidArea,
      setMP0P$Pos
    }
  },
  render(_this) {
    const basePopCls = 'miku-pop'
    const { position = 'top' } = this.$props

    const pop_final_cls = classNames(basePopCls, `place-${position}`)

    const children = this.$slots.default!()
    const content = this.$slots.content!()

    const positionStyle = {
      left: this.state.P0P5tyle.left + 'px',
      top: this.state.P0P5tyle.top + 'px'
    }

    /** @see 没有悬挂Root容器时,PopRef能正常在Mount钩子中获取||调用Root容器后,就不行了  */
    return (
      // 类似于|>Vue<|的|>template<|模板
      <>
        <HangRoot>
          <Bound ref={(_r_: any) => this.PopRef = _r_} active={this.state.M5howP0P} onNotifyEntered={this.setMP0P$Pos}>
            <div className={pop_final_cls} style={positionStyle}>
              <div className={`${basePopCls}__inner`}>{content}</div>
            </div>
          </Bound>
        </HangRoot>
        {h(children[0], { ref: (_r_: any) => this.R7arReference = _r_ }, undefined)}
      </>
    )
  }
})
