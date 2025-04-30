import { M9EditorPlugin, M9EditorOptions } from './Type'
import M9EPlugins from './plugin'
import M9EPanels from './panel'

class M9Editor {
  toolBarFragment: DocumentFragment | null
  plugins: M9EditorPlugin[]
  editorDOM: M9EditorOptions['$dom']
  selection: Selection
  range: Range
  destructor: Function[]
  _bindPushSelection: (this: HTMLElement, ev: FocusEvent) => any

  constructor (options: M9EditorOptions) {
    this.plugins = []
    const { $dom } = options
    this.selection = this.getSelection()!
    this.editorDOM = $dom
    this.editorDOM.contentEditable = 'true'

    this.destructor = []

    this._bindPushSelection = this.pushSelection.bind(this)

    this.editorDOM.addEventListener('blur', this._bindPushSelection)
  }

  // 富文本编辑区域 失焦时, 保留选中区域 进行压栈, 防止一些类似字体选择, 有二次弹框处理方式的类型, 弹框出现时, 选中区失效问题
  pushSelection () {
    const { selection } = this
    if (selection && !selection.isCollapsed) {
      const range = selection?.getRangeAt(0)
      console.log("selection", selection?.toString(), selection, range)
      this.range = range
    }
  }
  // 选中区域进行出栈, 取出当前留存的选区
  popSelection () {
    const { selection, range } = this;

    if (selection && range) {
      if (selection.rangeCount > 0) selection.removeAllRanges()
      selection.addRange(range.cloneRange())
    }
  }

  // 注册各种插件 - 渐进式增强富文本编辑功能
  register (plugin: M9EditorPlugin) {
    this.plugins.push(plugin)
  }

  // 文本选取域 - getter
  getSelection () {
    return window.getSelection()
  }

  // 对文本选取域 - 执行命令操作
  exec (cmd: string, val) {
    this.popSelection()
    document.execCommand(cmd, true, val)
  }

  // 启动美九富文本编辑器
  __start () {
    const toolBarFragment = document.createDocumentFragment()
    this.plugins.forEach((plugin) => {
      const { id, _html, _tips, doWhat } = plugin
      const __toolButton = document.createElement('button')
      __toolButton.innerHTML = _html
      __toolButton.setAttribute('id', id)
      __toolButton.setAttribute('class', 'm9-editor__toolbar--btn')
      __toolButton.onclick = (ev: MouseEvent) => {
        doWhat(this)
        // this.selection.removeAllRanges()
      }

      toolBarFragment.appendChild(__toolButton)
    })

    this.toolBarFragment = toolBarFragment
    this.editorDOM.before(toolBarFragment)

    M9EPanels.forEach(m9ePanel => {
      const { unionM9EButtonId, onLoad } = m9ePanel
      const unionM9EButton = document.getElementById(unionM9EButtonId)
      if (unionM9EButton) {
        const __handlerToDestroy = onLoad && onLoad(this, m9ePanel, unionM9EButton)
        if (typeof __handlerToDestroy === 'function') {
          this.destructor.push(__handlerToDestroy)
        }
      }
    })
  }

  // 销毁美九富文本编辑器
  __destruction () {
      if (!this.toolBarFragment) {
        return null
      }
      // 如果需要销毁DocumentFragment, 只需移除其内容
      while (this.toolBarFragment.firstChild) {
        this.toolBarFragment.removeChild(this.toolBarFragment.firstChild)
      }
      // this.editorDOM.removeChild(this.toolBarFragment)
      this.toolBarFragment = null

      this.destructor.forEach(f => f())
      this.editorDOM.removeEventListener('blur', this._bindPushSelection)
  }
}

export default function M9EditorCtor(options: M9EditorOptions) {
  const m9Editor = new M9Editor(options)
  M9EPlugins.forEach(plugin => plugin(m9Editor))
  m9Editor.__start()
  return m9Editor
}
