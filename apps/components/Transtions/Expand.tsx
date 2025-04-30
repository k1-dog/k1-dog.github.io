import { defineComponent, onBeforeUnmount, ref, Ref, watch } from 'vue'

interface MTExpandProps {
  MSwitch: boolean
}

interface MTExpandState {}

export default defineComponent({
  name: 'M9Expand',
  props: {
    // ? 高度折叠器 - 控制开关
    isRun: {
      type: Boolean,
      default: false
    }
  },
  setup (props) {
    const selfRef: Ref<HTMLElement | null>= ref(null)
    var MTExpand = {
      _EXP_DURATION_: 223,
      transition: { transition: `height ${223}ms ease-in-out` }
    }

    let enterTimer: NodeJS.Timeout | number | undefined = undefined
    let leaveTimer: NodeJS.Timeout | number | undefined = undefined

    function prepare (status = 0) {
      const el = selfRef.value
  
      function extractOldStyle(el_: HTMLElement) {
        el_.dataset.oldPaddingTop = el_.style.paddingTop
        el_.dataset.oldPaddingBottom = el_.style.paddingBottom
        el_.dataset.oldOverflow = el_.style.overflow! /** @see 本小姐暂时没看懂为何要记录这个属性 */
      }
  
      if (!!el) {
        extractOldStyle(el)
        el.style.display = 'block' /** @see dispaly将其变为块级元素,否则高度无法设置 */
        el.style.overflow = 'hidden' /** @see 本小姐暂时不清楚为何用Overflow==hidden */
  
        switch (status) {
          case 0:
            /** @see 元素的进入时动画===BeforeEnter */
  
            el.style.height = '0' // --------- |
            el.style.paddingTop = '0' // ----- | => 猜测能否用一句 (el.scrollHeight = 0) 囊括
            el.style.paddingBottom = '0' // -- |
            /** @see in-fact:_scrollHeight==|paddingTop|+|height|+|paddingBottom| */
            break
          case 1:
            /** @see 元素的离开时动画===BeforeLeave */

            if (el.scrollHeight !== 0) {
              el.style.height = el.scrollHeight + 'px' /** @see !!important__property__setting */
            }
            break
          default:
            break
        }
      }
    }

    function MTBeforeEnter(): number {
      prepare(0)
      MTEntering()

      return 1
    }

    function MTEntering() {
      const el = selfRef.value
  
      if (!!el) {
        if (el.scrollHeight !== 0) {
          el.style.height = el.scrollHeight + 'px'
        } else {
          el.style.height = ''
        }
  
        el.style.paddingTop = el.dataset.oldPaddingTop!
        el.style.paddingBottom = el.dataset.oldPaddingBottom!
      }
  
      enterTimer = setTimeout(() => MTAfterEnter(), MTExpand._EXP_DURATION_ + 1)
    }

    function MTAfterEnter(): void {
      const el = selfRef.value
      if (!!el) {
        el.style.height = '' /** @see !!这里解释一下为什么要要在结束动画时清空高度值
        -> 有时候, 该折叠容器下会嵌套更深的折叠容器, height清空, 即
        不固定高度, 折叠器会自动累加子元素高度, 这样才是真正的高度, 从而撑开最外层原本的容器, 使布局外观正常 */
        el.style.overflow = el.dataset.oldOverflow!
      }
    }
  
    function MTBeforeLeave(): void {
      prepare(1) // 先给出折叠器器高度 -- 否则transition过渡不生效
      MTLeaving() // 再将折叠器高度设置为0
    }

    function MTLeaving(): void {
      const el = selfRef.value
  
      if (!!el) {
        if (el.scrollHeight !== 0) {
          el.style.height = '0'
          el.style.paddingTop = '0'
          el.style.paddingBottom = '0'
        }
      }
  
      leaveTimer = setTimeout(() => MTAfterLeft(), MTExpand._EXP_DURATION_ + 1)
    }
    function MTAfterLeft() {
      const el = selfRef.value
      if (!!el) {
        el.style.display = 'none' // 这边设成none, 该元素就不会占据DOM文档树结构, 不会引起重绘、重流
        el.style.height = '' /** @see height===0__?? */
        el.style.overflow = el.dataset.oldOverflow!
        el.style.paddingTop = el.dataset.oldPaddingTop!
        el.style.paddingBottom = el.dataset.oldPaddingBottom!
      } else {
        return
      }
      // el.parentNode?.removeChild(el);
    }

    watch(() => props.isRun, (isRun: boolean) => {
      clearTimeout(enterTimer as number)
      clearTimeout(leaveTimer as number)
      if (isRun) {
        MTBeforeEnter()
      } else {
        MTBeforeLeave()
      }
    }, { immediate: true })

    onBeforeUnmount(() => {
      MTBeforeLeave()
    })

    return {
      selfRef,
      MTExpand
    }
  },
  render() {
    const children = this.$slots.default!()
    const { MTExpand } = this
    const { style = {} } = this.$attrs
    return (
      <div ref={(v: HTMLElement | null) => { this.selfRef = v }} style={{ ...MTExpand.transition, ...style as object }}>
        {children}
      </div>
    )
  }
})
