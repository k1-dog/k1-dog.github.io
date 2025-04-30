import { onBeforeMount } from "vue"


// export function useNodeJSDocument (isInVue = 1) {
//   let __r
//   const p = new Promise((resolve) => {
//     __r = resolve
//   })
//   if (isInVue) {
//     onBeforeMount(() => {
//       __r(document)
//     })
//   } else {
//     setTimeout(() => { __r(document) }, 50)
//   }

//   return p
// }

export const M9Drag1nWindow = (el, callback, callbackEnd = function () { }, callbackStart = function () { }) => {
  if (!el) {
    return
  }
  let move = {
    _x: 0,
    _y: 0
  }
  let offset = {
    _x: 0,
    _y: 0
  }
  let finalPosition = {
    left: 0,
    top: 0
  }
  const dragInit = (ele, evt) => {
    return [
      {
        left: ele.getBoundingClientRect().left,
        top: ele.getBoundingClientRect().top
      },
      {
        _x: evt.clientX,
        _y: evt.clientY
      }
    ]
  }
  const dragoffset = (posD, posM) => {
    return {
      _x: posM._x - posD._x,
      _y: posM._y - posD._y
    }
  }
  const eleposition = (_init, _offset) => {
    return {
      left: _init.left + _offset._x,
      top: _init.top + _offset._y
    }
  }

  el.onmousedown = function (e) {
    // ! 这里设置下 - onselectstart 事件阻止其默认行为, 防止总是在鼠标拖动时, 选中其他元素的文字内容问题, 不然会中断拖拽行为
    document.onselectstart = function () { return false }
    callbackStart(el)
    // 这里每次按下鼠标 都重新创建 init down 会不会一直占用堆空间不释放呢
    const [init, down] = dragInit(el, e)
    document.onmousemove = function (e) {
      move._x = e.clientX
      move._y = e.clientY
      offset = dragoffset(down, move)
      finalPosition = eleposition(init, offset)
      callback(el, offset, finalPosition)
    }
    document.onmouseup = function (e) {
      document.onmousemove = null
      document.onmouseup = null
      document.onselectstart = null
      callbackEnd(el, offset, finalPosition)
    }
  }

  return () => {
    el.onmousedown = null
  }
}

export function M9FindPos (event) {
  var scrollTop = document.documentElement.scrollTop || document.body.scrollTop
  var scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft

  return { _x_: event.clientX + scrollLeft, _y_: event.clientY + scrollTop }
}

export const __on = (el, event, _handler, _capture = false /* 默认事件为冒泡传递 */) => {
  if (window.addEventListener) {
    el.addEventListener(event, _handler, _capture)
  } else if (window.attachEvent) {
    el.attachEvent(`on${event}`, _handler)
  }
}

export const __off = (el, event, _handler) => {
  if (window.removeEventListener) {
    el.removeEventListener(event, _handler)
  } else if (window.detachEvent) {
    el.detachEvent(`on${event}`, _handler)
  } else {
    el[`on${event}`] = null
  }
}

export function isMikuEle (obj) {
  return typeof HTMLElement === 'object'
    ? obj instanceof HTMLElement
    : !!(obj && typeof obj === 'object' && (obj.nodeType === 1 || obj.nodeType === 9) && typeof obj.nodeName === 'string')
}