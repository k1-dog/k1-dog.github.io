import { TPL_PUMPKIN } from './template.cjs'

/**
 * @description 原生南瓜头组件
 * @param { 初始化一个南瓜头组件 } props
 */

export default class Pumpkin extends HTMLElement {
  constructor() {
    super()
    this.shadowRootEl = this.attachShadow({ mode: 'open' })
  }

  static compoName = "k1-pumpkin"
  static register = function () {
    if (!window.customElements.get(Pumpkin.compoName)) {
      window.customElements.define(Pumpkin.compoName, Pumpkin)
    }
  }
  // 被监听的属性，是一个静态的数组类型属性
  static get observedAttributes () { return ["lighting"] }
  attributeChangedCallback (propK, _ov_, _nv_) {
    return this.render()
  }

  get lighting () {
    return this.getPropV('lighting')
  }
  set lighting (_isLighting) {
    this.setAttribute('lighting', _isLighting)
  }

  getPropV ($propK) {
    const _ifIs = this.hasAttribute($propK)
    return _ifIs && this.getAttribute($propK) || undefined
  }

  connectedCallback () {
    this.render()
  }

  render () {
    const { shadowRootEl, lighting: isLighting } = this
    shadowRootEl.innerHTML = TPL_PUMPKIN('miku-pumpkin', { isLighting })
  }
}