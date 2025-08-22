import { App, createApp } from 'vue'
import M9Message from './Message'
import { M9MsgProps, M9MessageInstanceT, M9MessageInsListT } from './Type'

// .usage
// import M9Message from '.'
// const m9MsgInstance_1 = M9Message.success({ text: '成功!' })
// const m9MsgInstance_2 = M9Message({ type: 'error', text: '失败!' })
// const m9MsgInstance_2 = M9Message.warning('警告!')
// m9MsgInstance_1.$destroy()

export default (function M9MessageDispatcher () {
  let messageInstanceList: M9MessageInsListT = []

  let _T800: NodeJS.Timeout | null = null

  const getMessageID = (function () {
    let id = 0
    return function () {
      id += 1
      return id
    }
  })()

  function MsgCaller (props: M9MsgProps) {
    _T800 = setTimeout(() => show(props), 0)
  }

  // ! 唯一难点::怎么在消息组件实例销毁的时候, 自动触发一下这里的 deleteMsgInstance 方法
  function deleteInstance ($msgInstance) {
    const targetMsgInsIdx = messageInstanceList.findIndex(_msgInstance =>_msgInstance['m9-msg-id'] === $msgInstance['m9-msg-id'])
    const targetMsgInstance = messageInstanceList.splice(targetMsgInsIdx, 1)[0]
    
    targetMsgInstance.$.appContext.app.unmount()
    layoutMessageOffset()
  }

  function addInstance ($msgInstance: M9MessageInstanceT) {
    $msgInstance['m9-msg-id'] = getMessageID()
    messageInstanceList.push($msgInstance)
  }

  function createMessageApp (msgComponent: typeof M9Message, msgProps: M9MsgProps): [App<Element>, HTMLElement] {
    const msgRootDOM = document.createElement('div')

    document.body.appendChild(msgRootDOM)

    return [
      createApp(msgComponent, {
        ...msgProps,
        messageRoot: msgRootDOM,
        onDestroy: deleteInstance
      }),
      msgRootDOM
    ]
  }

  // ! 后续可以在这加个节流函数 - 防止短时间内频繁重复弹出消息框
  function show (props: M9MsgProps, type?: M9MsgProps['type']) {
    if (_T800) {
      clearTimeout(_T800)
      _T800 = null
    }

    if (!props) return

    const messageProps: M9MsgProps = type && { ...props, type } || props

    const [messageApp, msgRootDOM] = createMessageApp(M9Message, messageProps)
      
    const messageInstance: any = messageApp.mount(msgRootDOM)

    addInstance(messageInstance)
    // ? 排布所有消息框的页面位移布局样式
    layoutMessageOffset()
  }

  function layoutMessageOffset () {
    _T800 = setTimeout(() => {
      let TopOffset = 50

      for (let _msgIdx = 0; _msgIdx < messageInstanceList.length; _msgIdx++) {
        const messageInstance = messageInstanceList[_msgIdx]
        const messageInstanceElement = messageInstance.$el.parentNode.getElementsByClassName('m9-msg')[0]
        const currentTop = messageInstanceElement.getBoundingClientRect().height
        
        messageInstanceElement.setAttribute('style', `top: ${TopOffset}px`)
        TopOffset += currentTop
      }

      clearTimeout(_T800!)
      _T800 = null
    }, 0)
  }

  MsgCaller.success = function (customProps: any) {
    if (typeof customProps === 'string') {
      customProps = { text: customProps }
    }

    show(customProps, 'success')
  }

  MsgCaller.warning = function (customProps: any) {
    if (typeof customProps === 'string') {
      customProps = { text: customProps }
    }

    show(customProps, 'warning')
  }

  MsgCaller.error = function (customProps: any) {
    if (typeof customProps === 'string') {
      customProps = { text: customProps }
    }

    show(customProps, 'error')
  }

  MsgCaller.info = function (customProps: any) {
    if (typeof customProps === 'string') {
      customProps = { text: customProps }
    }

    show(customProps, 'info')
  }

  return MsgCaller
})()