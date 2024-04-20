
import M9Message from './Message'
import { ComponentInstance } from "vue"

export interface M9MsgProps {
  // ? 消息类型 - success | warning | error | info
  type: 'success' | 'warning' | 'error' | 'info'
  // ? 消息文本 -
  text: string
  // ? 消息 - 延迟时间
  life?: number
}

export interface M9MsgState {
  // - 消息框是否展示
  isShow: boolean
}

export type M9MessageInstanceT = ComponentInstance<typeof M9Message>

export type M9MessageInsListT = Array<M9MessageInstanceT>