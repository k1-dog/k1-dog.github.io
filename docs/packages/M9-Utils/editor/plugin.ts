// 加粗插件
export const boldPlugin = function (M9Editor) {
  const __newMember = {
    id: 'fontbold-btn',
    _html: `<span style="font-weight: bold;">加粗 B</span>`, // 展示在页面上的 html 标签结构
    _tips: `加粗`, // 鼠标悬浮该功能按钮时的提示语
    doWhat ($M9Editor) { // 鼠标点击该功能按钮时的触发事件
      $M9Editor.exec('bold')
      // const Selection = $M9Editor.getSelection()
      // const StartRange = Selection.getRangeAt(0)
      // const newNode = document.createElement('span')
      // newNode.textContent = '😄'
      // StartRange.deleteContents()
      // StartRange.insertNode(newNode)
    }
  }
  
  return M9Editor.register(__newMember)
}
// 字体颜色选择插件
export const fontColorPlugin = function (M9Editor) {
  const __newMember = {
    id: 'fontcolor-btn',
    _html: `<span style="font-weight: bold;">颜色 B</span>`, // 展示在页面上的 html 标签结构
    _tips: `字体颜色`, // 鼠标悬浮该功能按钮时的提示语
    doWhat ($M9Editor, color) { // 鼠标点击该功能按钮时的触发事件
      // $M9Editor.panels.colorSelector.run(fontColorCall) 弹出颜色选择器面板
      $M9Editor.exec('foreColor', color)
    }
  }

  return M9Editor.register(__newMember)
}
// 背景颜色选择插件
export const bgColorPlugin = function (M9Editor) {
  const __newMember = {
    id: 'bgcolor-btn',
    _html: `<span style="font-weight: bold;">背景颜色 B</span>`, // 展示在页面上的 html 标签结构
    _tips: `背景颜色`, // 鼠标悬浮该功能按钮时的提示语
    doWhat ($M9Editor, color) { // 鼠标点击该功能按钮时的触发事件
      // $M9Editor.panels.colorSelector.run() 弹出颜色选择器面板
    }
  }

  return M9Editor.register(__newMember)
}
// 字体大小选择插件
export const fontSizePlugin = function (M9Editor) {
  const __newMember = {
    id: 'fontsize-btn',
    _html: `<span style="font-weight: bold;">字体大小 B</span>`, // 展示在页面上的 html 标签结构
    _tips: `字体大小`, // 鼠标悬浮该功能按钮时的提示语
    doWhat ($M9Editor) { // 鼠标点击该功能按钮时的触发事件
      // $M9Editor.panels.fontSizeSelector.run() 弹出字体大小下拉框选择面板
    }
  }

  return M9Editor.register(__newMember)
}
// 图片上传插件
export const imageUploadPlugin = function (M9Editor) {
  const __newMember = {
    id: 'imgupload-btn',
    _html: `<span style="font-weight: bold;">插入图片 B</span>`, // 展示在页面上的 html 标签结构
    _tips: `插入图片`, // 鼠标悬浮该功能按钮时的提示语
    doWhat ($M9Editor) { // 鼠标点击该功能按钮时的触发事件
      // $M9Editor.panels.imageUploader.run() 弹出图片上传面板
    }
  }

  return M9Editor.register(__newMember)
}

const plugins = [boldPlugin, fontColorPlugin, bgColorPlugin, fontSizePlugin, imageUploadPlugin]

export default plugins