import { Ref, computed, getCurrentInstance, onBeforeUnmount, onMounted, reactive, ref } from "vue"
import M9DragHelper from "./element-drag-helper"
import { M9Drag1nWindow } from "../index"

interface M9DraggerState {
  left: number, top: number
}

// 拖拽事件
function onDragging ($el, $dragOffset, $finalPosition) {
  const { top, left, bottom, right, width, height } = $el.getBoundingClientRect()
  const dragHelperLeft = $finalPosition.left
  const dragHelperTop = $finalPosition.top

  return { dragHelperLeft, dragHelperTop }
}

let _$m9DragHelper

// 边界检测
function _isEdge ($targetElementRect, $dragOffset, direction: 'left' | 'right' | 'top' | 'bottom' = 'left') {
  const { width: childWidth, height: childHeight, left: lastLeft, top: lastTop } = $targetElementRect

  if (direction === 'left' || direction === 'right') {
    let _offsetX = $dragOffset._x
    let _nextWidth = childWidth
    let _nextLeft = lastLeft
    if (direction === 'left') {
      _nextWidth = childWidth - _offsetX
      _nextLeft += _offsetX
    } else {
      _nextWidth = childWidth + _offsetX
    }
    // ! 这里说一下 - 为什么边界值设定为10, 因为我拖拽元素本身宽度就5像素, 所以如果被包裹的元素宽度小于5的话，肯定不合适, 就定成10了
    if (_nextWidth <= 10) {
      _nextWidth = 40
      _offsetX += 40
      if (direction === 'left') _nextLeft -= 40
    }
    return { _nextWidth, nextHeight: childHeight,  _nextLeft, nextTop: lastTop, _offsetX, offsetY: 0 }
  } else if (direction === 'top' || direction === 'bottom') {
    let _offsetY = $dragOffset._y
    let _nextHeight = childHeight
    let _nextTop = lastTop
    if (direction === 'top') {
      _nextHeight = childHeight - _offsetY
      _nextTop += _offsetY
    } else {
      _nextHeight = childHeight + _offsetY
    }
    // ! 这里说一下 - 为什么边界值设定为10, 因为我拖拽元素本身宽度就5像素, 所以如果被包裹的元素宽度小于5的话，肯定不合适, 就定成10了
    if (_nextHeight <= 10) {
      _nextHeight = 40
      _offsetY += 40
      if (direction === 'top') _nextTop -= 40
    }
    return { nextWidth: childWidth, _nextHeight, nextLeft: lastLeft, _nextTop, _offsetY, offsetX: 0 }
  }

  return { nextWidth: childWidth, nextHeight: childHeight,  nextLeft: lastLeft, nextTop: lastTop, offsetY: 0, offsetX: 0 }
}

function useLeftDragHook ($childRef, $props, $ctx) {
  const leftDragRef: Ref<any> = ref(null)
  const leftState = reactive<M9DraggerState>({ left: 0, top: 0 })
  const leftDraggerStyle = computed(() => ({ top: `${leftState.top}px`, left: `${leftState.left + 5}px` }))

  function onLeftDraggstart () {
    _$m9DragHelper.onChangeDirection('y')
  }
  function onLeftDragging ($el, $dragOffset, $finalPosition) {
    const { dragHelperLeft, dragHelperTop } = onDragging($el, $dragOffset, $finalPosition)

    _$m9DragHelper.onChangePosition({ x: dragHelperLeft, y: dragHelperTop, opacity: 1 })
  }

  function onLeftDraggend ($el, $dragOffset, $finalPosition) {
    const childRectInfo = $childRef.value.getBoundingClientRect()
    const nextRectInfo = _isEdge(childRectInfo, $dragOffset, 'left')

    leftState.left = nextRectInfo.nextWidth
    $ctx.emit('dragend', { dragKey: $props.dragKey, ...nextRectInfo })
    _$m9DragHelper.onChangePosition({ x: 0, y: 0, opacity: 0 })
  }

  return { leftDragRef, leftState, leftDraggerStyle, onLeftDraggstart, onLeftDragging, onLeftDraggend }
}

function useRightDragHook ($childRef, $props, $ctx) {
  const rightDragRef: Ref<any> = ref(null)
  const rightState = reactive<M9DraggerState>({ left: 0, top: 0 })
  const rightDraggerStyle = computed(() => ({ top: `${rightState.top}px`, left: `${rightState.left - 5}px` }))

  function onRightDraggstart () {
    _$m9DragHelper.onChangeDirection('y')
  }
  function onRightDragging ($el, $dragOffset, $finalPosition) {
    const { dragHelperLeft, dragHelperTop } = onDragging($el, $dragOffset, $finalPosition)

    _$m9DragHelper.onChangePosition({ x: dragHelperLeft, y: dragHelperTop, opacity: 1 })
  }

  function onRightDraggend ($el, $dragOffset, $finalPosition) {
    const childRectInfo = $childRef.value.getBoundingClientRect()
    const nextRectInfo = _isEdge(childRectInfo, $dragOffset, 'right')

    rightState.left = nextRectInfo.nextWidth
    $ctx.emit('dragend', { dragKey: $props.dragKey, ...nextRectInfo })
    _$m9DragHelper.onChangePosition({ x: 0, y: 0, opacity: 0 })
  }

  return { rightDragRef, rightState, rightDraggerStyle, onRightDragging, onRightDraggend, onRightDraggstart }
}

function useTopDragHook ($childRef, $props, $ctx) {
  const topDragRef: Ref<any> = ref(null)
  const topState = reactive<M9DraggerState>({ left: 0, top: 0 })
  const topDraggerStyle = computed(() => ({ top: `${topState.top + 5}px`, left: `${topState.left}px` }))

  function onTopDraggstart () {
    _$m9DragHelper.onChangeDirection('x')
  }

  function onTopDragging ($el, $dragOffset, $finalPosition) {
    const { dragHelperLeft, dragHelperTop } = onDragging($el, $dragOffset, $finalPosition)

    _$m9DragHelper.onChangePosition({ x: dragHelperLeft, y: dragHelperTop, opacity: 1 })
  }

  function onTopDraggend ($el, $dragOffset, $finalPosition) {
    const childRectInfo = $childRef.value.getBoundingClientRect()
    const nextRectInfo = _isEdge(childRectInfo, $dragOffset, 'top')

    topState.top = nextRectInfo.nextHeight
    $ctx.emit('dragend', { dragKey: $props.dragKey, ...nextRectInfo })
    _$m9DragHelper.onChangePosition({ x: 0, y: 0, opacity: 0 })
  }

  return { topDragRef, topState, topDraggerStyle, onTopDragging, onTopDraggend, onTopDraggstart }
}

function useBottomDragHook ($childRef, $props, $ctx) {
  const bottomDragRef: Ref<any> = ref(null)
  const bottomState = reactive<M9DraggerState>({ left: 0, top: 0 })
  const bottomDraggerStyle = computed(() => ({ top: `${bottomState.top - 5}px`, left: `${bottomState.left}px` }))

  function onBottomDraggstart () {
    _$m9DragHelper.onChangeDirection('x')
  }

  function onBottomDragging ($el, $dragOffset, $finalPosition) {
    const { dragHelperLeft, dragHelperTop } = onDragging($el, $dragOffset, $finalPosition)

    _$m9DragHelper.onChangePosition({ x: dragHelperLeft, y: dragHelperTop, opacity: 1 })
  }

  function onBottomDraggend ($el, $dragOffset, $finalPosition) {
    const childRectInfo = $childRef.value.getBoundingClientRect()
    const nextRectInfo = _isEdge(childRectInfo, $dragOffset, 'bottom')

    bottomState.top = nextRectInfo.nextHeight
    $ctx.emit('dragend', { dragKey: $props.dragKey, ...nextRectInfo })
    _$m9DragHelper.onChangePosition({ x: 0, y: 0, opacity: 0 })
  }

  return { bottomDragRef, bottomState, bottomDraggerStyle, onBottomDragging, onBottomDraggend, onBottomDraggstart }
}

export default function useM9Dragger ($props, $ctx) {
  _$m9DragHelper = M9DragHelper({ direction: 'x' })
  const childRef = ref()
  const { leftDragRef, leftState, leftDraggerStyle, onLeftDragging, onLeftDraggend, onLeftDraggstart } = useLeftDragHook(childRef, $props, $ctx)
  const { rightDragRef, rightState, rightDraggerStyle, onRightDragging, onRightDraggend, onRightDraggstart } = useRightDragHook(childRef, $props, $ctx)
  const { topDragRef, topState, topDraggerStyle, onTopDragging, onTopDraggend, onTopDraggstart } = useTopDragHook(childRef, $props, $ctx)
  const { bottomDragRef, bottomState, bottomDraggerStyle, onBottomDragging, onBottomDraggend, onBottomDraggstart } = useBottomDragHook(childRef, $props, $ctx)

  let _killLeftDragHandler = function () {}
  let _killRightDragHandler = function () {}
  let _killTopDragHandler = function () {}
  let _killBottomDragHandler = function () {}

  let _T1000: null | NodeJS.Timeout = null

  function onNotifyUpdateState () {
    if (_T1000) {
      clearTimeout(_T1000)
      _T1000 = null
    }
    // ! 这里有点儿疑惑 - 不延时足够的时间的话, 被包裹的子元素宽高尺寸信息 就无法准确获取到
    _T1000 = setTimeout(() => {
      const { width: ChildWidth, height: ChildHeight, top: ChildTop, left: ChildLeft } = childRef.value.getBoundingClientRect()

      const { isLeft, isRight, isTop, isBottom, isAutoCalculate } = $props

      // ! 当被包裹元素 - 的外层容器 [不能] 自由控制其几何尺寸信息时, 的计算逻辑
      if (isAutoCalculate) {
        if (isRight) {
          rightState.top = ChildTop
          rightState.left = ChildWidth + ChildLeft - 5
        }
        if (isLeft) {
          leftState.top = ChildTop
          leftState.left = ChildLeft + 5
        }
        if (isTop) {
          topState.top = ChildTop + 5
          topState.left = ChildLeft
        }
        if (isBottom) {
          bottomState.top = ChildTop + ChildHeight - 5
          bottomState.left = ChildLeft
        }
      }
      // ! 当被包裹元素 - 的外层容器 能自由控制其几何尺寸信息时, 的计算逻辑
      else {
        if (isRight) {
          rightState.top = 0
          rightState.left = ChildWidth - 10
        }
        if (isLeft) {
          leftState.top = 0
          leftState.left = 0 + 10
        }
        if (isTop) {
          topState.top = 0 + 10
          topState.left = 0
        }
        if (isBottom) {
          bottomState.top = ChildHeight - 10
          bottomState.left = 0
        }
      }

      clearTimeout(_T1000!)
      _T1000 = null
    }, 800)
  }

  onMounted(() => {
    onNotifyUpdateState()
    const { isLeft, isRight, isTop, isBottom } = $props
    if (isLeft) {
      _killLeftDragHandler = M9Drag1nWindow(leftDragRef.value, onLeftDragging, onLeftDraggend, onLeftDraggstart)
    }
    if (isRight) {
      _killRightDragHandler = M9Drag1nWindow(rightDragRef.value, onRightDragging, onRightDraggend, onRightDraggstart)
    }
    if (isTop) {
      _killTopDragHandler = M9Drag1nWindow(topDragRef.value, onTopDragging, onTopDraggend, onTopDraggstart)
    }
    if (isBottom) {
      _killBottomDragHandler = M9Drag1nWindow(bottomDragRef.value, onBottomDragging, onBottomDraggend, onBottomDraggstart)
    }
  })

  onBeforeUnmount(() => {
    _killLeftDragHandler && _killLeftDragHandler()
    _killRightDragHandler && _killRightDragHandler()
    _killTopDragHandler && _killTopDragHandler()
    _killBottomDragHandler && _killBottomDragHandler()
  })

  return {
    childRef,
    leftDragRef, leftDraggerStyle,
    rightDragRef, rightDraggerStyle,
    topDragRef, topDraggerStyle,
    bottomDragRef, bottomDraggerStyle,
    onNotifyUpdateState
  }
}
