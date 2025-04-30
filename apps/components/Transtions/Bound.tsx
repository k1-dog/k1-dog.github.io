import { Ref, defineComponent, getCurrentInstance, h, onBeforeMount, onBeforeUnmount, onMounted, ref, watch } from 'vue'

export interface MikuBoundProps {
  /**
   * 动画持续时长 (外设)
   * @param {number} duration
   */
  duration2: number

  /**
   * 激活开关 @param {boolean} active
   */
  active: boolean
}

export interface MikuBoundState {}

export default defineComponent({
  name: 'M9Bounding',
  props: {
    duration2: {
      type: Number,
      default: 300
    },
    active: {
      type: Boolean,
      default: false
    }
  },
  emits: ['notifyEntered', 'notifyEnded'],
  setup (props, ctx) {
    const vm = getCurrentInstance()

    let selfRef: any = null
    
    const DEF_DUR = 0.47

    const boundingRef: Ref<HTMLElement | Text | null> = ref(null)

    let _T$enterTimer: NodeJS.Timer | number | null = null

    let _T$endTimer: NodeJS.Timer | number | null = null

    let _F$mountFlag: Boolean = false

    // * 二进制计数:: 00 - 未挂载未初始化 | 10 - 已挂载未初始化 | 01 - 未挂载已初始化 | 11 - 已挂载已初始化
    let _I$initFlag: number = 0b00
    const baseTrans: { opacity: number; transition: string; } = {
      opacity: 0,
      // transitionProperty: 'transform, opacity',
      // transitionDuration: `${MBounding.DEF_DUR + MBounding.DEF_TIME_UNIT}`,
      // transitionTimingFunction: 'cubic-bezier(.42,.89,.45,0)'
      transition: `transform, opacity, border 0.47s, 0.47s, 0.47s cubic-bezier(.42,.89,.45,0)`
    }
    /**
     * @description 二进制 - 位取值操作
     * @param { number } bit
     * @param { number } posAt
     * @param { number } BitLen
     */
    function _B$valueAtBit(bit: number, posAt: number, BitLen: number) {
      const rightMovingLen = BitLen - posAt
      const value = (bit >> rightMovingLen) & 1
      return value
    }
    // 
    function MikuBoundChange(isActive: MikuBoundProps['active']) {
      const __boundingRef$1 = boundingRef.value as HTMLElement
      if (__boundingRef$1) {
        typeof _T$endTimer === 'number' && window.clearTimeout(_T$endTimer)
        typeof _T$enterTimer === 'number' && window.clearTimeout(_T$enterTimer)
        _T$endTimer = null
        _T$enterTimer = null
        !!isActive ? MTBeforeEnter(__boundingRef$1) : MTOnExiting(__boundingRef$1)
      }
    }
    // * 进入动画之前 - 存储被变换元素的 样式属性上下文 - 结束时, 用以还原
    function _S$Keep2PropertyContext($el: HTMLElement) {
      const TempElement = $el
      // * keep display 属性
      $el.dataset.oldDisplay = TempElement.style.display!
      // * keep 内边距 -padding- 属性
      $el.dataset.oldPaddingTop = TempElement.style.paddingTop
      $el.dataset.oldPaddingBottom = TempElement.style.paddingBottom
      $el.dataset.oldPaddingLeft = TempElement.style.paddingLeft
      $el.dataset.oldPaddingRight = TempElement.style.paddingRight
      $el.dataset.oldTrusyHeight = (TempElement.offsetHeight || TempElement.clientHeight || TempElement.scrollHeight) + ''
      $el.dataset.oldTrusyWidth = (TempElement.offsetWidth || TempElement.clientWidth) + ''

      // * keep overflow属性
      $el.dataset.oldOverflow = TempElement.style.overflow! // 本小姐暂时没看懂为何要记录这个属性
    }
    function _S$Kill2PropertyContext($el: HTMLElement) {
      'oldDisplay' in $el.dataset && delete $el.dataset['oldDisplay']
      'oldOverflow' in $el.dataset && delete $el.dataset['oldOverflow']
      'oldTrusyWidth' in $el.dataset && delete $el.dataset['oldTrusyWidth']
      'oldPaddingTop' in $el.dataset && delete $el.dataset['oldPaddingTop']
      'oldTrusyHeight' in $el.dataset && delete $el.dataset['oldTrusyHeight']
      'oldPaddingLeft' in $el.dataset && delete $el.dataset['oldPaddingLeft']
      'oldPaddingRight' in $el.dataset && delete $el.dataset['oldPaddingRight']
      'oldPaddingBottom' in $el.dataset && delete $el.dataset['oldPaddingBottom']
    }
    // todo 动画开始周期样式变化
    function MTBeforeEnter (node: HTMLElement | null): void {
      if (!_F$mountFlag) {
        return void 0
      }

      const isMounted = _B$valueAtBit(_I$initFlag, 1, 2) && _B$valueAtBit(_I$initFlag, 2, 2) && !!node
      // ! 挂载完成并且初始化完成
      if (isMounted && !!node) {
        _T$enterTimer && window.clearTimeout(_T$enterTimer as any) // as NodeJS.Timer
        node.style.display = 'inline-block'
        _S$Keep2PropertyContext(node)
        let _T01: number | null | undefined = window.setTimeout(() => {
          node.style.overflow = 'hidden'
          node.style.opacity = '1'
          node.style.height = parseInt(node.dataset.oldTrusyHeight!) + 'px'
          node.style.width = parseInt(node.dataset.oldTrusyWidth!) + 'px'
          // node.style.width = node.style.height = '0px'
          // node.style.paddingTop = node.style.paddingBottom = node.style.paddingLeft = node.style.paddingRight = '0'
          node.style.transform = 'scale(1)'
          node.style.borderBottomWidth = '5px'
          node.style.borderRightWidth = '5px'
          node.style.borderLeftWidth = '5px'
          node.style.transition = baseTrans.transition!
          MTEnterTodo$1(node)
          window.clearTimeout(_T01!)
          _T01 = null || undefined
        }, 0)
      }
    }
    function MTEnterTodo$1 (node: HTMLElement | null) {
      if (!!node) {
        node.style.opacity = '0.7'
        // node.style.paddingTop = node.dataset.oldPaddingTop!
        // node.style.paddingBottom = node.dataset.oldPaddingBottom!
        // node.style.paddingLeft = node.dataset.oldPaddingLeft!
        // node.style.paddingRight = node.dataset.oldPaddingRight!
  
        // node.style.height = (parseInt(node.dataset.oldTrusyHeight!) / 3) * 2 + 'px'
        // node.style.width = parseInt(node.dataset.oldTrusyWidth!) / 2 + 'px'
        node.style.overflow = node.dataset.oldOverflow!
        node.style.transform = 'scale(0.79)'
        node.style.borderBottomWidth = '0'
        node.style.borderRightWidth = '10px'
        node.style.borderLeftWidth = '10px'
  
        _T$enterTimer = window.setTimeout(() => {
          MTEnterTodo$2(node)
        }, DEF_DUR * 1000 + 10)
      }
    }
    function MTEnterTodo$2 (node: HTMLElement | null) {
      if (!!node) {
        node.style.transform = 'scale(1)'
        node.style.borderBottomWidth = '0'
        node.style.borderRightWidth = '5px'
        node.style.borderLeftWidth = '5px'
        node.style.opacity = '1'
        node.style.overflow = '' /*null*/
        // node.style.display = node.dataset.oldDisplay!
        node.style.transition = ''
        _S$Kill2PropertyContext(node)
        ctx.emit('notifyEntered') 
      }
    }
    // 动画结束周期样式变化
    function MTOnExiting (node: HTMLElement | null) {
      // ! 如果当前元素初始化时的 状态为隐藏 - 则不需要走动画过渡
      const _1stActive = _B$valueAtBit(_I$initFlag, 3, 3)
      if (_1stActive === 0) {
        // ? 最后一二进制位是 0 时, 代表初始态为隐藏
        _I$initFlag = _I$initFlag | 1
        node!.style.display = 'none'
        // ? 后续退出时, 再走过渡效果
        return void 0
      }

      const isMounted = _B$valueAtBit(_I$initFlag, 1, 3) && _B$valueAtBit(_I$initFlag, 2, 3)
      if (isMounted && !!node) {
        _T$endTimer && window.clearTimeout(_T$endTimer as any)
        node.style.display = 'inline-block'
        let _T00X: number | null | undefined = window.setTimeout(() => {
          _S$Keep2PropertyContext(node)
          node.style.overflow = 'hidden'
          node.style.opacity = '1'
          node.style.transform = `scale(1.23)`
          node.style.height = parseInt(node.dataset.oldTrusyHeight!) + 'px'
          node.style.width = parseInt(node.dataset.oldTrusyWidth!) + 'px'
          // node.style.width = node.style.height = '0px'
          // node.style.paddingTop = node.style.paddingBottom = node.style.paddingLeft = node.style.paddingRight = '0'
          node.style.borderTopWidth = '5px'
          node.style.borderRightWidth = '5px'
          node.style.borderLeftWidth = '5px'
          node.style.transition = baseTrans.transition!
          MTBeforeExit(node)
          window.clearTimeout(_T00X!)
          _T00X = null || undefined
        }, 0)
      }
    }
    function MTBeforeExit (node: HTMLElement | null) {
      // ! 挂载完成并且初始化完成
      if (!!node) {
        node.style.opacity = '0.79'
        node.style.transform = `scale(0.79)`
        _T$endTimer = window.setTimeout(() => {
          node.style.borderTopWidth = '0px'
          node.style.borderRightWidth = '10px'
          node.style.borderLeftWidth = '10px'
          MTAfterExit(node)
        }, DEF_DUR * 1000 + 10)
      }
    }
    function MTAfterExit (node: HTMLElement | null) {
      if (!!node) {
        node.style.borderTopWidth = '5px'
        node.style.borderRightWidth = '5px'
        node.style.borderLeftWidth = '5px'
        node.style.overflow = '' /*null*/
        node.style.opacity = '0' // ''空值 和 0 是两回事 要设置成0
        node.style.transform = 'scale(1)'
        node.style.transition = ''
        node.style.display = 'none'
        _S$Kill2PropertyContext(node)
        ctx.emit('notifyEnded')
      }
    }

    onBeforeMount(() => {
      // 实现 MikuBoundState 契约
      const { active } = props
      _I$initFlag = 0b010 | Number(active)
    })
    onMounted(() => {
      const { active } = props
      _F$mountFlag = true
      _I$initFlag = 0b110
      selfRef = vm?.vnode.el
      MikuBoundChange(active)
    })
    onBeforeUnmount(() => {
      _F$mountFlag = false
      _I$initFlag = 0b000
      selfRef && MTOnExiting(selfRef as HTMLElement)
    })

    watch(() => props.active, (nextActive) => {
      _F$mountFlag = nextActive
      MikuBoundChange(nextActive)
    })

    return { boundingRef }
  },
  render(_this) {
    const children = this.$slots.default!()

    return h(children[0], { ref: (_r_: any) => this.boundingRef = _r_ }, undefined)
  }
})