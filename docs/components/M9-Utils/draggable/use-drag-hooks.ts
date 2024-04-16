import { Ref, computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from "vue"
import M9DragHelper from "./element-drag-helper"
import { M9Drag1nWindow } from "../index"

interface M9DraggerState {
  left: number, top: number
}

// 拖拽事件
function onDragging (el, dragoffset, finalPosition) {
  const { top, left, bottom, right, width, height } = el.getBoundingClientRect()
  const _dragHelperLeft = finalPosition.left
  const _dragHelperTop = finalPosition.top

  return { _dragHelperLeft, _dragHelperTop }
}

// 边界检测
function _isEdge (targetElementRect, dragoffset, direction: 'left' | 'right' | 'top' | 'bottom' = 'left') {
  const { width: childWidth, height: childHeight, left: lastLeft, top: lastTop } = targetElementRect

  if (direction === 'left' || direction === 'right') {
    let offsetX = dragoffset._x
    let nextWidth = childWidth
    let nextLeft = lastLeft
    if (direction === 'left') {
      nextWidth = childWidth - offsetX
      nextLeft += offsetX
    } else {
      nextWidth = childWidth + offsetX
    }
    // ! 这里说一下 - 为什么边界值设定为10, 因为我拖拽元素本身宽度就5像素, 所以如果被包裹的元素宽度小于5的话，肯定不合适, 就定成10了
    if (nextWidth <= 10) {
      nextWidth = 40
      offsetX += 40
      if (direction === 'left') nextLeft -= 40
    }
    return { nextWidth, nextHeight: childHeight,  nextLeft, nextTop: lastTop, offsetX, offsetY: 0 }
  } else if (direction === 'top' || direction === 'bottom') {
    let offsetY = dragoffset._y
    let nextHeight = childHeight
    let nextTop = lastTop
    if (direction === 'top') {
      nextHeight = childHeight - offsetY
      nextTop += offsetY
    } else {
      nextHeight = childHeight + offsetY
    }
    // ! 这里说一下 - 为什么边界值设定为10, 因为我拖拽元素本身宽度就5像素, 所以如果被包裹的元素宽度小于5的话，肯定不合适, 就定成10了
    if (nextHeight <= 10) {
      nextHeight = 40
      offsetY += 40
      if (direction === 'top') nextTop -= 40
    }
    return { nextWidth: childWidth, nextHeight, nextLeft: lastLeft, nextTop, offsetY, offsetX: 0 }
  }

  return { nextWidth: childWidth, nextHeight: childHeight,  nextLeft: lastLeft, nextTop: lastTop, offsetY: 0, offsetX: 0 }
}

function useLeftDragHook ($m9DragHelper, childRef, props, ctx) {
  const leftDragRef: Ref<any> = ref(null)
  const leftState = reactive<M9DraggerState>({ left: 0, top: 0 })
  const leftDraggerStyle = computed(() => ({ top: `${leftState.top}px`, left: `${leftState.left + 5}px` }))

  function onLeftDraggstart () {
    $m9DragHelper.onChangeDirection('y')
  }
  function onLeftDragging (el, dragoffset, finalPosition) {
    const { _dragHelperLeft, _dragHelperTop } = onDragging(el, dragoffset, finalPosition)

    $m9DragHelper.onChangePosition({ x: _dragHelperLeft, y: _dragHelperTop, opacity: 1 })
  }

  function onLeftDraggend (el, dragoffset, finalPosition) {
    const childRectInfo = childRef.value.getBoundingClientRect()
    const nextRectInfo = _isEdge(childRectInfo, dragoffset, 'left')
    
    leftState.left = nextRectInfo.nextWidth
    ctx.emit('dragend', { dragKey: props.dragKey, ...nextRectInfo })
    $m9DragHelper.onChangePosition({ x: 0, y: 0, opacity: 0 })
  }

  return { leftDragRef, leftState, leftDraggerStyle, onLeftDraggstart, onLeftDragging, onLeftDraggend }
}

function useRightDragHook ($m9DragHelper, childRef, props, ctx) {
  const rightDragRef: Ref<any> = ref(null)
  const rightState = reactive<M9DraggerState>({ left: 0, top: 0 })
  const rightDraggerStyle = computed(() => ({ top: `${rightState.top}px`, left: `${rightState.left - 5}px` }))

  function onRightDraggstart () {
    $m9DragHelper.onChangeDirection('y')
  }
  function onRightDragging (el, dragoffset, finalPosition) {
    const { _dragHelperLeft, _dragHelperTop } = onDragging(el, dragoffset, finalPosition)

    $m9DragHelper.onChangePosition({ x: _dragHelperLeft, y: _dragHelperTop, opacity: 1 })
  }

  function onRightDraggend (el, dragoffset, finalPosition) {
    const childRectInfo = childRef.value.getBoundingClientRect()
    const nextRectInfo = _isEdge(childRectInfo, dragoffset, 'right')
    
    rightState.left = nextRectInfo.nextWidth
    ctx.emit('dragend', { dragKey: props.dragKey, ...nextRectInfo })
    $m9DragHelper.onChangePosition({ x: 0, y: 0, opacity: 0 })
  }

  return { rightDragRef, rightState, rightDraggerStyle, onRightDragging, onRightDraggend, onRightDraggstart }
}

function useTopDragHook ($m9DragHelper, childRef, props, ctx) {
  const topDragRef: Ref<any> = ref(null)
  const topState = reactive<M9DraggerState>({ left: 0, top: 0 })
  const topDraggerStyle = computed(() => ({ top: `${topState.top + 5}px`, left: `${topState.left}px` }))

  function onTopDraggstart () {
    $m9DragHelper.onChangeDirection('x')
  }

  function onTopDragging (el, dragoffset, finalPosition) {
    const { _dragHelperLeft, _dragHelperTop } = onDragging(el, dragoffset, finalPosition)

    $m9DragHelper.onChangePosition({ x: _dragHelperLeft, y: _dragHelperTop, opacity: 1 })
  }

  function onTopDraggend (el, dragoffset, finalPosition) {
    const childRectInfo = childRef.value.getBoundingClientRect()
    const nextRectInfo = _isEdge(childRectInfo, dragoffset, 'top')
    
    topState.top = nextRectInfo.nextHeight
    ctx.emit('dragend', { dragKey: props.dragKey, ...nextRectInfo })
    $m9DragHelper.onChangePosition({ x: 0, y: 0, opacity: 0 })
  }

  return { topDragRef, topState, topDraggerStyle, onTopDragging, onTopDraggend, onTopDraggstart }
}

function useBottomDragHook ($m9DragHelper, childRef, props, ctx) {
  const bottomDragRef: Ref<any> = ref(null)
  const bottomState = reactive<M9DraggerState>({ left: 0, top: 0 })
  const bottomDraggerStyle = computed(() => ({ top: `${bottomState.top - 5}px`, left: `${bottomState.left}px` }))

  function onBottomDraggstart () {
    $m9DragHelper.onChangeDirection('x')
  }

  function onBottomDragging (el, dragoffset, finalPosition) {
    const { _dragHelperLeft, _dragHelperTop } = onDragging(el, dragoffset, finalPosition)

    $m9DragHelper.onChangePosition({ x: _dragHelperLeft, y: _dragHelperTop, opacity: 1 })
  }

  function onBottomDraggend (el, dragoffset, finalPosition) {
    const childRectInfo = childRef.value.getBoundingClientRect()
    const nextRectInfo = _isEdge(childRectInfo, dragoffset, 'bottom')
    
    bottomState.top = nextRectInfo.nextHeight
    ctx.emit('dragend', { dragKey: props.dragKey, ...nextRectInfo })
    $m9DragHelper.onChangePosition({ x: 0, y: 0, opacity: 0 })
  }

  return { bottomDragRef, bottomState, bottomDraggerStyle, onBottomDragging, onBottomDraggend, onBottomDraggstart }
}

export default function useM9Dragger ($props, $ctx) {
  let _m9DragHelperIns = M9DragHelper({ direction: 'y' })
  const childRef = ref()
  const { leftDragRef, leftState, leftDraggerStyle, onLeftDragging, onLeftDraggend, onLeftDraggstart } = useLeftDragHook(_m9DragHelperIns, childRef, $props, $ctx)
  const { rightDragRef, rightState, rightDraggerStyle, onRightDragging, onRightDraggend, onRightDraggstart } = useRightDragHook(_m9DragHelperIns, childRef, $props, $ctx)
  const { topDragRef, topState, topDraggerStyle, onTopDragging, onTopDraggend, onTopDraggstart } = useTopDragHook(_m9DragHelperIns, childRef, $props, $ctx)
  const { bottomDragRef, bottomState, bottomDraggerStyle, onBottomDragging, onBottomDraggend, onBottomDraggstart } = useBottomDragHook(_m9DragHelperIns, childRef, $props, $ctx)

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
