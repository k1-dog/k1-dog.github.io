import classNames from 'classnames'
import { CSSProperties, ComponentInternalInstance, PropType, defineComponent, getCurrentInstance, h, onMounted, onUnmounted, nextTick } from 'vue'
import MsgX from '../Message/controller'

/**
 * @see 美九小栅栏每行格子数-<*_-24-_*>-
 */
var MM_GRID_CELL_NUM = 24

const MGridPreCls = 'miku-grid'

const MGRowPreCls = `${MGridPreCls}__row`

const MGColPreCls = `${MGridPreCls}__col`

type MGRowProps = {
  MGGutter: number | number[] /** @see 纵横间距 */
  type?: 'flex' | '' /** @see定义布局方式__主要是为了支持__Flex_布局 */
  justify?: 'start' | 'end' | 'center' | 'space-between' | 'space-around' /** @see__Flex横轴排列方式 */
  align?: 'start' | 'end' | 'center' /** @see__Flex纵轴排列方式 */
}
type MGColProps = {
  span: number | string
  MGutter?: number | string
  offset?: number | string
  align?: 'left' | 'right'
}
interface MGRowExtendsProps extends MGRowProps {
  __MGColItem: typeof MGCol
}
interface MGColExtendsProps extends MGColProps {
  __MIKU_COMPO_NAME_FLAG_?: boolean
}

const Compute5tyle = function (_cur$cell$$num: number) {
  return _cur$cell$$num / MM_GRID_CELL_NUM
}

interface MGridProps {}
// const MGrid = (props: MGridProps) => {
//   return (
//     <div className={`${MGridPreCls}`}>
//       <MGRow></MGRow>
//       {
//         // 填充__MRow__行内容
//       }
//     </div>
//   );
// };


// * 网页元素自适应控制器
type M9WebDOMEffectsT = Map<Element, Function>
// '::m9-pid => lg -> display:inline-block 900; width: 500px; height : 200px;|md-> width :100px |sm -> opacity: 0.5'
export const M9WebAdaptor = (function () {
  let G_sourceElementsMap: Map<number, M9WebDOMEffectsT> = new Map()
  return defineComponent({
  name: 'M9WebAdaptor',
  setup () {
    var G_webAdaptorId = Date.now()
    const m9ObConfig = { attributes: true, attributeFilter: ['style'], attributeOldValue: true, childList: true, subtree: true }
    let G_sourceElementMap: Map<Element, M9WebDOMEffectsT> = new Map()

    // * 启动嗅探工作 - 爬取目标组件渲染出的页面中 - 标记 m9-web-dom 的属性元素 —> 准备进行自适应处理
    function bootSniffer () {
      const _VmInstance: ComponentInternalInstance | null = getCurrentInstance()
      if (!_VmInstance) {
        MsgX.warning({ text: '美九自适应元素 ~ 嗅探器抓取当前组件实例失败, 请检查是否在正确的组件周期内执行嗅探器', life: 2000 })
        return
      }
      
      const _el = _VmInstance.vnode!.el
      if (!_el) return

      const targetElement = _el.nextElementSibling
      start(targetElement)
    }
    var _m9WebDOMObserver: null | MutationObserver = null
    function destorySniffer () {
      if (_m9WebDOMObserver !== null) {
        // if (G_sourceElementsMap.has(G_webAdaptorId)) {
        //   const currentWebSElements = G_sourceElementsMap.get(G_webAdaptorId)
        //   currentWebSElements
        // }
        // G_sourceElementsMap.forEach((everySElement, k) => {
        //   everySElement.webDomEffects.clear()
        // })
        G_sourceElementMap.forEach((targetDOMEffects, sElement) => {
          targetDOMEffects.clear()
        })
        G_sourceElementMap.clear()
        _m9WebDOMObserver.disconnect()
        _m9WebDOMObserver.takeRecords()
        _m9WebDOMObserver = null
      }
    }
    const m9_size_width_map = {
      lg: 1100,
      md: 876,
      sm: 642
  }
    // 编译解析 - 对应的 m9-web-dom 尺寸响应样式, 提取出来
    function compile ($m9WebDOM: Element): void | [Element, null | object] {
      const m9_web_dom_markString = $m9WebDOM.getAttribute('m9-web-dom')
    
      if (!m9_web_dom_markString) return
    
      function c_m9_web_sourceElement ($String) {
        const regStringToSourceElementId = /^\s*::\s*(\S*)\s*(?:=>)/
        const regObjToSourceElementId = new RegExp(regStringToSourceElementId, 'g')
        const $m9WebSourceID = regObjToSourceElementId.exec($String)
        
        let _sElement: Element
        if (!$m9WebSourceID) {
          _sElement = $m9WebDOM
        } else {
          // 如果源元素是 document 标记, 那就直接记录 document 文档节点
          if ($m9WebSourceID[1] === 'document') {
            _sElement = document.documentElement
          } else {
            const sourceElement = document.getElementById($m9WebSourceID[1])
            if (!sourceElement) {
              _sElement = $m9WebDOM
            } else {
              _sElement = sourceElement
            }
          }
        }
        return _sElement
      }
      // 1. 找寻响应的源元素 [即根据哪个元素去响应变化]
      const m9_web_sourceElement = c_m9_web_sourceElement(m9_web_dom_markString)
      // 2. 组装响应的目标元素下边, 各个尺寸及对应的样式信息
      function c_m9_web_sizeStyles ($String) {
        const regStringTo_lg_md_sm = /(?:\s*=>\s*)(.*)\s*/
    
        const regObjTo_lg_md_sm = new RegExp(regStringTo_lg_md_sm, 'g')
    
        const lg_md_sm = regObjTo_lg_md_sm.exec($String)
    
        if (!lg_md_sm)  return null
    
        const lg_md_sm_list = lg_md_sm[1].split('|')
    
        const regObjTo__ = new RegExp(/(lg|md|sm)\s*->\s*(.*)/, 'g')
        const size_style_map = lg_md_sm_list.reduce(($, _) => {
          const __ = regObjTo__.exec(_)
          if (!__) {
            return $
          }
          regObjTo__.lastIndex = 0
          const sizeType = __[1]
          let cleanSizeStyleString = __[2]
          cleanSizeStyleString = cleanSizeStyleString.trim()
          const lastIndexSemicolon = cleanSizeStyleString.lastIndexOf(';')
          if (lastIndexSemicolon > -1 && lastIndexSemicolon === cleanSizeStyleString.length - 1) {
            cleanSizeStyleString = cleanSizeStyleString.substr(0, lastIndexSemicolon).trim()
          } else {
            cleanSizeStyleString = cleanSizeStyleString.trim()
          }
          
          const styleObject = cleanSizeStyleString.split(';').reduce(($_, __property_value_string__) => {
              let [property, value] = __property_value_string__.split(':')
              property = property.trim()
              value = value.trim()
              $_[property] = value
              return $_
          }, {})
          $[sizeType] = styleObject
      
          return $
        }, {})

        return Object.keys(size_style_map).length > 0 ? size_style_map : null
      }
    
      const sizeStyleConfig = c_m9_web_sizeStyles(m9_web_dom_markString)
    
      return [m9_web_sourceElement, sizeStyleConfig]
    }
    
    function start (element: HTMLElement) {
      function onWebDOMSizeChange ($mutationList) {
        $mutationList.forEach(m9WebAction => {
          const m9WebSElement = m9WebAction.target
          const m9WebSElement_effects = G_sourceElementMap.get(m9WebSElement)
          if (m9WebSElement_effects) {
            m9WebSElement_effects.forEach((fn, k) => fn(m9WebSElement))
          }
        })
        // console.log('🚀 ~ onWebDOMSizeChange ~ mutationList:', $mutationList)
      }
      _m9WebDOMObserver = new MutationObserver(onWebDOMSizeChange)
    
      walk(element, _m9WebDOMObserver)
    }
    function walk (targetElement: Element, webObserver: MutationObserver) {
      const isM9WebDOM = targetElement.hasAttribute('m9-web-dom')
      if (isM9WebDOM) {
        const result = compile(targetElement)
        if (result) {
          const [find_sElement, sizeStyleConfig] = result
          if (sizeStyleConfig) {
            if (!G_sourceElementMap.has(find_sElement)) {
              G_sourceElementMap.set(find_sElement, new Map())
            }
            let targetWebEffectsMap = G_sourceElementMap.get(find_sElement)
            if (!targetWebEffectsMap) {
              targetWebEffectsMap = new Map()
            }
            targetWebEffectsMap.set(targetElement, function ($sourceElement) {
              const { width: sourceWidth, height: sourceHeight } = $sourceElement.getBoundingClientRect()
              let styleObject: null | object = null
              if (sourceWidth <= m9_size_width_map['lg'] && sourceWidth > m9_size_width_map['md']) {
                const _size = 'lg'
                styleObject = sizeStyleConfig[_size]
              } else if (sourceWidth <= m9_size_width_map['md'] && sourceWidth > m9_size_width_map['sm']) {
                const _size = 'md'
                styleObject = sizeStyleConfig[_size]
              } else {
                const _size = 'sm'
                styleObject = sizeStyleConfig[_size]
              }
              
              if (styleObject) {
                if (targetElement.hasAttribute('m9-keep-property')) {
                  const keepOldPropertyString = targetElement.getAttribute('m9-keep-property')
                  const keepOldPropertyList = keepOldPropertyString!.split('|')
                  // 删除之前旧的响应属性样式
                  keepOldPropertyList.forEach(oldProperty => {
                    (targetElement as HTMLElement).style.removeProperty(oldProperty)
                  })
                }
                
                for (let property in styleObject) {
                  const value = styleObject[property];
                  (targetElement as HTMLElement).style[property] = value
                }
                targetElement.setAttribute('m9-keep-property', Object.keys(styleObject).join('|'))
              }
            })

            G_sourceElementMap.set(find_sElement, targetWebEffectsMap)
            
            webObserver.observe(find_sElement, m9ObConfig)
          }
        }
      }
      
      const arrayItsChildren = Array.from(targetElement.children)
      if (Array.isArray(arrayItsChildren) && arrayItsChildren.length > 0) {
        arrayItsChildren.forEach(childEl => walk(childEl, webObserver))
      }
    }

    onMounted(() => {
      bootSniffer()
    })
    onUnmounted(() => {
      destorySniffer()
    })
  },
  render () {
    const children = this.$slots.default && this.$slots.default()
    return <>{children}</>
  }
  })
})()

const MGRow = defineComponent({
  name: 'M9Row',
  props: {
    MGGutter: {
      type: [Number, Array] as PropType<MGRowProps['MGGutter']>,
      default: 10
    },
    type: {
      type: String as PropType<MGRowProps['type']>,
      default: 'flex'
    },
    justify: {
      type: String as PropType<MGRowProps['justify']>,
      default: 'center'
    },
    align: {
      type: String as PropType<MGRowProps['align']>,
      default: 'center'
    },
  },
  setup (props) {
    const MGRow$5tyleCompute: CSSProperties = {}

    function GRowConstruction () {
      const { MGGutter, type, justify, align } = props
      let Vertical$4um, Horizon$4um, mcol_gutter: number | undefined
      if (Array.isArray(MGGutter)) {
        Vertical$4um = MGGutter[0] ? MGGutter[0] / 2 : undefined
        MGRow$5tyleCompute.marginTop = Vertical$4um
        MGRow$5tyleCompute.marginBottom = Vertical$4um

        Horizon$4um = MGGutter[1] ? MGGutter[1] / 2 : undefined
      } else {
        Horizon$4um = MGGutter ? MGGutter / 2 : undefined
      }
      MGRow$5tyleCompute.marginLeft = Horizon$4um
      MGRow$5tyleCompute.marginRight = Horizon$4um
      mcol_gutter = Horizon$4um

      const MGRowCls = classNames(MGRowPreCls, {
        flex: type,
        [`Jus-${justify}`]: type && justify,
        [`Aln-${align}`]: type && align
      })

      return [MGRowCls, MGRow$5tyleCompute]
    }

    return { GRowConstruction }
  },
  render () {
    const { GRowConstruction, $props: { MGGutter } } = this

    const [MGRowCls, MGRow$5tyleCompute] = GRowConstruction()

    const children = this.$slots.default!()

    return (
      <div className={MGRowCls} style={MGRow$5tyleCompute}>
        {
          // 填充__MCol__列内容
          children.map((MCol: any) => {
            const { span = 0, offset = 0, ...restProps } = MCol.props
            return h(MCol, { span, offset, MGutter: MGGutter, ...restProps }, undefined )
          })
        }
      </div>
    )
  }
})

// span = 0,
// offset = 0,
// MGutter = 0,
// align = 'left',
// ...restProps
export const MGCol = defineComponent({
  name: 'M9Col',
  props: {
    span: {
      type: Number as PropType<MGColProps['span']>,
      default: 8
    },
    offset: {
      type: Number as PropType<MGColProps['offset']>,
      default: 0
    },
    MGutter: {
      type: Number as PropType<MGColProps['MGutter']>,
      default: 0
    },
    align: {
      type: String as PropType<MGColProps['align']>,
      default: 'left'
    }
  },
  setup (props) {
    function GColConstruction () {
      let span = props.span

      if (typeof span === 'string') { span = parseInt(span) }

      // ? 默认为右浮动
      const cell_num_flex = classNames(`${MGColPreCls}-${span}`, `${MGColPreCls}`, [props.align === 'left' ? `flt` : `frt`])
      const marginStyle = { padding: `0 ${props.MGutter}px` }

      return [cell_num_flex, marginStyle]
    }

    return { GColConstruction }
  },
  render () {
    const { GColConstruction, $attrs = {} } = this
    const [cell_num_flex, marginStyle] = GColConstruction()
    const children = this.$slots.default!()

    return (
      <div className={cell_num_flex} style={marginStyle} {...$attrs}>
        {
          children // 渲染目标元素到单元格子中
        }
      </div>
    )
  }
})

MGRow.__MGColItem = MGCol

export const M9Col = MGCol
export const M9Row = MGRow
