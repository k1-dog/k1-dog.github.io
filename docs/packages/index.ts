import './style.scss' // 打包时把这行注释放开, 打包的内容里会带上 style.css 全部的样式文件

import { App } from 'vue'

import { M9Row, M9Col } from './Grid/Grid'
import M9Nav from './Navigation/Navigation'
import M9Spin from './Spin/Spin'
import M9Popover from './Popover/Popover'
import M9Card from './Card/Card'
import M9Tabs from './Tabs/Tabs'
import M9Modal from './Modal/Modal'

import M9Input from './Input/Input'
import M9Button from './Button/index'
import M9CheckBox from './CheckBox/CheckBox'
import M9DatePicker from './DatePicker/index'
import M9Select from './Select/Select'
import M9Switch from './Switch/Switch'
import M9File from './File/File'
import M9Form from './Form/Form'
import M9Table from './Table/Table'

import M9Chart from './M9-Charts/m9._z0_'

import M9Msg from './Message/controller'
import M9Drag from './M9-Utils/draggable/element-dragger'

//按需引入
const components = {
  M9Button,
  M9CheckBox,
  M9CheckboxItem: M9CheckBox.Item,
  M9DatePicker,
  M9Row, M9Col,
  M9Input,
  M9Modal,
  M9Nav,
  M9Popover,
  M9Select,
  M9Spin,
  M9Switch,
  M9Card,
  M9Tabs,
  M9File,
  M9Form,
  M9Table
}

//全局引入
const vue3Install = (app: App) => {
  Object.values(components).forEach(compo => { app.component(compo.name, compo) })
}

export const M9MsgX = M9Msg
export const M9DragX = M9Drag
export const M9K1ChartX = M9Chart
export const M9InstallX = vue3Install

export default {
  ...components
}