function mountM9EPanel ($targetBtn, $current) {

  $current.classList.add('m9e__panel--self')

  document.body.appendChild($current)

  let _Tx50: null | NodeJS.Timeout = setTimeout(() => {
    const posstat = $targetBtn.getBoundingClientRect()
  
    const { width: panelWidth, height: panelHeight, bottom: panelTop, left: panelLeft } = posstat
  
    $current.style.setProperty('top', panelTop + 'px')
    $current.style.setProperty('left', panelLeft + 'px')
    $current.style.setProperty('width', panelWidth + 'px')
    $current.style.setProperty('height', panelHeight + 'px')

    clearTimeout(_Tx50!)
    _Tx50 = null
  }, 50)
  
  return () => {
    $current.parentNode && $current.parentNode.removeChild($current)
    $current = null
  }
}

// 颜色选择器 Canvas - Color Picker
function ColorPickerToCanvas(onPickerColor) {
// Canvas 实现原生 颜色选择器

var G_graphConfig = {
    colorGap: 5,
    colorWidth: 15,
    colorHeight: 15
}

class Point {
    x = -1
    y = -1
    constructor(x, y) {
        this.x = x
        this.y = y
    }
}

class Side {
    p1 = {}
    p2 = {}
    type
    constructor(p1, p2, type = 'line') {
        this.p1 = p1
        this.p2 = p2
        this.type = type
    }
}

function cleanRetina($ctx) {
    const dpi = window.devicePixelRatio
    const canvas = $ctx.canvas
    canvas.style.width = canvas.width + 'px'
    canvas.style.height = canvas.height + 'px'
    canvas.setAttribute("width", canvas.width * dpi)
    canvas.setAttribute("height", canvas.height * dpi)
    $ctx.scale(dpi, dpi)
}

function U$CalcGraphContextEdges($rowIndex, $colIndex, $graphConfig) {
    const { colorGap, colorWidth, colorHeight } = $graphConfig
    const botEdge = $rowIndex * (colorHeight + colorGap)
    const topEdge = botEdge + colorHeight
    const ltEdge = $colIndex * (colorWidth + colorGap)
    const rtEdge = ltEdge + colorWidth
    return { botEdge, topEdge, ltEdge, rtEdge, width: colorWidth, height: colorHeight }
}

function ColorPicker() {
    // 定义基础原初七色列表 [赤 橙 黄 绿 青 蓝 紫]
    const colorList = [
        '#ff0000', '#ff8000', '#ffff00', '#008000', '#00c8c8', '#0039ff', '#5900ff'
    ]
    // 定义基础渐进倍率
    const colorLightenRatioList = [0.15, 0.30, 0.45, 0.60, 0.75, 0.90]
    // 对原处七色 渐进式高亮
    function lightenColor(colorHex, ratio = 1.0) {
        const _RGB = colorHex.replace(/^#/, '')
        const _r = parseInt(_RGB.slice(0, 2), 16)
        const _g = parseInt(_RGB.slice(2, 4), 16)
        const _b = parseInt(_RGB.slice(4, 6), 16)
        const _r1 = Math.max(Math.round(255 * ratio), Math.min(255, _r + Math.round(_r * ratio)))
        const _g1 = Math.max(Math.round(255 * ratio), Math.min(255, _g + Math.round(_g * ratio)))
        const _b1 = Math.max(Math.round(255 * ratio), Math.min(255, _b + Math.round(_b * ratio)))
        let _r1Hex = _r1.toString(16)
        let _g1Hex = _g1.toString(16)
        let _b1Hex = _b1.toString(16)
        _r1Hex = _r1Hex.length > 1 ? _r1Hex : '0' + _r1Hex
        _g1Hex = _g1Hex.length > 1 ? _g1Hex : '0' + _g1Hex
        _b1Hex = _b1Hex.length > 1 ? _b1Hex : '0' + _b1Hex
        const new_RGB = `#${_r1Hex}${_g1Hex}${_b1Hex}`
        return new_RGB // * ratio
    }
    //  生成 7x6 的颜色二维矩阵
    const colorMatrix = colorLightenRatioList.map(ratio => colorList.map(color => lightenColor(color, ratio)))
    // 生成 绘笔 ctx2d
    const canvas = document.createElement('canvas')
    const { colorWidth, colorHeight, colorGap } = G_graphConfig
    canvas.width = colorList.length * (colorWidth + colorGap) - colorGap
    canvas.height = colorLightenRatioList.length * (colorHeight + colorGap) - colorGap
    const ctx2d = canvas.getContext('2d')
    cleanRetina(ctx2d)
    // 根据 颜色矩阵 - 绘制对应的 颜色矩阵图表
    const colorContexts = drawColorPanel(ctx2d, colorMatrix)
    // 关联绑定每个颜色块对应的颜色点击事件
    const removeEventHandler = addColorPickEvent(ctx2d!.canvas, colorContexts)

    const viewport = U$CreateViewportContainer()
    viewport.appendChild(canvas)
    
    return { viewport, destroyFn: removeEventHandler }
}

function U$CreateViewportContainer() {
    const viewport = document.createElement('div')
    viewport.style.setProperty('background', 'white')
    viewport.style.setProperty('border', '2px solid #959595')
    viewport.style.setProperty('display', 'inline-block')
    viewport.style.setProperty('padding', '4px')
    viewport.style.setProperty('border-radius', '4px')
    viewport.style.setProperty('max-height', '100px')
    viewport.style.setProperty('overflow-y', 'scroll')
    return viewport
}

function U$PushPopCtx2D($ctx, $callback) {
    $ctx.save()
    $callback($ctx)
    $ctx.restore()
}

function addColorPickEvent(canvas, colorContexts) {
    // 碰撞检测
    function H_collisionDetect($point, $allSides) {
        const { x, y } = $point
        const _intersectionCount = $allSides.reduce((intersectionCount, $side) => {
            const { p1, p2 } = $side
            if ((p1.y < y && p2.y < y) || (p1.y >= y && p2.y >= y)) {
                return intersectionCount
            } else {
                // ? 如果是曲线 - 怎么求交点
                // Y = k * (x - x1) + y1 | Y = y | k = (y2 - y1) / (x2 - x1) | sx = (b - y) / k
                const sx = ((y - p1.y) / (p2.y - p1.y)) * (p2.x - p1.x) + p1.x
                if (sx >= x) {
                    intersectionCount++
                }
                return intersectionCount
            }
        }, 0)
        return _intersectionCount > 0 && _intersectionCount % 2 !== 0
    }
    // 检查当前点 - 是否在某个图形域内
    function H_isPointInPath (point) {
        const colorCtx = colorContexts.find(_colorCtx => {
            const { vertexSideList } = _colorCtx
            return H_collisionDetect(point, vertexSideList)
        })
        return colorCtx
    }
    // 画布上 鼠标移动事件
    function onMovingAboveColor(e) {
        const { offsetX, offsetY } = e
        const movingPoint = { x: offsetX, y: offsetY }
        const m9Context = H_isPointInPath(movingPoint)
        if (!!m9Context) {
            e.target.style.setProperty('cursor', 'pointer')
        } else {
            e.target.style.setProperty('cursor', 'unset')
        }
    }
    // 画布上 鼠标点击事件
    function onClickingAboveColor(e) {
        const { offsetX, offsetY } = e
        const movingPoint = { x: offsetX, y: offsetY }
        const m9Context = H_isPointInPath(movingPoint)
        if (!!m9Context) {
            console.log("🚀 ~ onClickingAboveColor ~ m9Context:", m9Context)
            onPickerColor(m9Context)
        }
    }
    canvas.addEventListener('mousemove', onMovingAboveColor)
    canvas.addEventListener('click', onClickingAboveColor)
    return function removeColorPickEvent() {
        canvas.removeEventListener('click', onClickingAboveColor)
        canvas.removeEventListener('mousemove', onMovingAboveColor)
    }
}

function drawColorPanel($ctx2d, $colorMatrix) {
    const colorContexts = $colorMatrix.map(($colorGroup, rowIndex) => {
        return $colorGroup.map((colorHexValue, colIndex) => {
            const { botEdge, topEdge, ltEdge, rtEdge, width, height } = U$CalcGraphContextEdges(rowIndex, colIndex, G_graphConfig)

            const p1 = new Point(ltEdge, botEdge)
            const p2 = new Point(rtEdge, botEdge)
            const p3 = new Point(rtEdge, topEdge)
            const p4 = new Point(ltEdge, topEdge)
            const colorContext = {
                colorHexValue,
                rowIndex,
                colIndex,
                botEdge,
                topEdge,
                ltEdge,
                rtEdge,
                width,
                height,
                vertexSideList: [
                    new Side(p1, p2, 'line'),
                    new Side(p2, p3, 'line'),
                    new Side(p3, p4, 'line'),
                    new Side(p4, p1, 'line')
                ]
            }
            return colorContext
        })
    }).flat()
   
    colorContexts.forEach(colorContext => {// 绘制每个颜色块
        drawColorBlock($ctx2d, colorContext)
    })

    return colorContexts
}

// 绘制画布上的每一个颜色块
// ----  ----
// |  |  |  |
// ----  ----
//
function drawColorBlock($ctx, $colorCtx) {
    const { colorHexValue, botEdge, ltEdge, width, height } = $colorCtx
    const startX = ltEdge
    const startY = botEdge
    U$PushPopCtx2D($ctx, ($ctx) => {
        $ctx.beginPath()
        $ctx.rect(startX, startY, width, height)
        $ctx.fillStyle = colorHexValue
        $ctx.fill()
        $ctx.stroke()
    })
}

return ColorPicker()
}

const fontsizeZhNameMap = { 1: '一号', 2: '二号', 3: '三号', 4: '四号', 5: '五号', 6: '六号', 7: '七号', 8: '八号', 9: '九号', 10: '十号'}

const M9EPanelPlugin = [
  {
    id: 'fontsize-panel',
    unionM9EButtonId: 'fontsize-btn',
    _html: `<select style="width: 100%;"></select>`,
    _options: Array.from({ length: 10 }, (_, _i) => { return { text: `${fontsizeZhNameMap[_i + 1]}`, value: _i + 1 } }),
    onLoad ($m9Editor, $thisPanelConfig, $unionM9EButton: HTMLElement) {
      const { id, _html, _options: options, doWhat } = $thisPanelConfig
      let optionsFragment: null | DocumentFragment = document.createDocumentFragment()
      let __thisPanelDOM = document.createElement('section')
      __thisPanelDOM.innerHTML = _html
      const selector = __thisPanelDOM.firstChild as HTMLSelectElement

      options.forEach(option => {
        // new Option(text, value, defaultSelected, selected)
        // const optionEl = document.createElement('option')
        const optionEl = new Option(option.text, option.value)
        optionsFragment?.appendChild(optionEl)
      })
      
      selector.append(optionsFragment) // appendChild 就不行, 后边查下 append和appendChild 区别
      __thisPanelDOM.setAttribute('id', id)
      __thisPanelDOM.setAttribute('raw-display', __thisPanelDOM.style.display || 'block')
      __thisPanelDOM.style.setProperty('display', 'none')

      function onSelectFontSize ($event: Event) {
        // 获取选中的option的值
        // var selectedValue = selectElement.options[selectElement.selectedIndex].value
        const fontsize = ($event?.target as any).value + 'px'
        // 可以在这里添加你的处理代码
        doWhat($m9Editor, fontsize)
      }
      selector.addEventListener('change', onSelectFontSize)

      function isClickOutside ($anyElement: Node) {
        return !__thisPanelDOM.contains($anyElement) && !$unionM9EButton.contains($anyElement)
      }
      function onClickAnyWhere ($event: MouseEvent) {
        const any_where = $event.target as Node
        const _isOut = isClickOutside(any_where)
        if (_isOut) {
          __thisPanelDOM.style.setProperty('display', 'none')
        }
      }
      document.addEventListener('click', onClickAnyWhere)

      function onUnionM9EButtonToPlay (e) {
        const oldDisplay = __thisPanelDOM.style.display
        if (oldDisplay !== 'none') {
          __thisPanelDOM.setAttribute('raw-display', oldDisplay || 'block')
          __thisPanelDOM.style.setProperty('display', 'none')
        } else {
          const rawDisplay = __thisPanelDOM.getAttribute('raw-display')
          __thisPanelDOM.style.setProperty('display', rawDisplay)
        }
      }
      $unionM9EButton.addEventListener('click', onUnionM9EButtonToPlay)

      // 将选择框面板 绝对位置 挂载到 - 关联的 m9e 按钮上
      const __handlerToDestroyPanelDOM = mountM9EPanel($unionM9EButton, __thisPanelDOM)
      
      return function () {
        if (!optionsFragment) return
        while (optionsFragment.firstChild) {
          optionsFragment.removeChild(optionsFragment.firstChild)
        }
        // __thisPanelDOM.removeChild(optionsFragment)
        optionsFragment = null

        __handlerToDestroyPanelDOM && __handlerToDestroyPanelDOM()

        selector.removeEventListener('change', onSelectFontSize)
        document.removeEventListener('click', onClickAnyWhere)
        $unionM9EButton.removeEventListener('click', onUnionM9EButtonToPlay)
      }
    },
    doWhat ($M9Editor, $fontsize) { // 鼠标点击该功能按钮时的触发事件
      // $M9Editor.panels.colorSelector.run(fontColorCall) 弹出颜色选择器面板
      $M9Editor.exec('fontSize', $fontsize)
    }
  }, //  字体大小选择对应的下拉面板框
  {
    id: 'color-panel',
    unionM9EButtonId: 'bgcolor-btn',
    _html: ColorPickerToCanvas,
    onLoad ($m9Editor, $thisPanelConfig, $unionM9EButton: HTMLElement) {
      const { id, _html, _options: options, doWhat } = $thisPanelConfig
      let __thisPanelDOM = document.createElement('div')
      __thisPanelDOM.setAttribute('id', id)
      __thisPanelDOM.setAttribute('raw-display', __thisPanelDOM.style.display || 'block')
      __thisPanelDOM.style.setProperty('display', 'none')

      function onSelectColor (colorContext) {
        // 获取选中的color的Hex值
        const color = colorContext.colorHexValue
        // 可以在这里添加你的处理代码
        doWhat($m9Editor, color)
      }

      const { viewport, destroyFn: destroyColorPickerFn } = _html(onSelectColor)
      __thisPanelDOM.appendChild(viewport)

      function isClickOutside ($anyElement: Node) {
        return !__thisPanelDOM.contains($anyElement) && !$unionM9EButton.contains($anyElement)
      }
      function onClickAnyWhere ($event: MouseEvent) {
        const any_where = $event.target as Node
        const _isOut = isClickOutside(any_where)
        if (_isOut) {
          __thisPanelDOM.style.setProperty('display', 'none')
        }
      }
      document.addEventListener('click', onClickAnyWhere)

      function onUnionM9EButtonToPlay (e) {
        const oldDisplay = __thisPanelDOM.style.display
        if (oldDisplay !== 'none') {
          __thisPanelDOM.setAttribute('raw-display', oldDisplay || 'block')
          __thisPanelDOM.style.setProperty('display', 'none')
        } else {
          const rawDisplay = __thisPanelDOM.getAttribute('raw-display')
          __thisPanelDOM.style.setProperty('display', rawDisplay)
        }
      }
      $unionM9EButton.addEventListener('click', onUnionM9EButtonToPlay)

      // 将选择框面板 绝对位置 挂载到 - 关联的 m9e 按钮上
      const __handlerToDestroyPanelDOM = mountM9EPanel($unionM9EButton, __thisPanelDOM)
      
      return function () {
        __handlerToDestroyPanelDOM && __handlerToDestroyPanelDOM()

        destroyColorPickerFn()
        document.removeEventListener('click', onClickAnyWhere)
        $unionM9EButton.removeEventListener('click', onUnionM9EButtonToPlay)
      }
    },
    doWhat ($m9Editor, color) {$m9Editor.exec('foreColor', color)}
  }
]

export default M9EPanelPlugin