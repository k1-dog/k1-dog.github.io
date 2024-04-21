var T = Object.defineProperty;
var H = (i, t, e) => t in i ? T(i, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : i[t] = e;
var u = (i, t, e) => (H(i, typeof t != "symbol" ? t + "" : t, e), e);
const L = function(i = "", t) {
  const { isLighting: e } = t, o = 2, l = 1.5, s = o / l, m = o * l, f = s, y = o / 2.3, d = o / 5, b = d * 1.14, a = d / 2.625, S = s / 4, h = o / 4, n = o / 3.75, W = 1 / 2, g = n * W, $ = h, k = s / 6, c = d / 2.1, w = c / 2, p = s / 2.85, v = p / 2.24, z = m, R = { face: 1, stem: 2, eyes: 3, mouth: 4 };
  return `
    <style>
      .pumpkin{
        height: ${s}em;
        width: ${o}em;
        background: #f68632;
        border: 0.3em solid #a14907;
        border-radius: 70%/110%;
        position: relative;
        box-shadow: inset 0 0px ${m}px #a14907, 0 0 ${m * 1.5}px 1px red;
        z-index: ${R.face};
      }
      
      .pumpkin .surface{
        height: ${f}em;
        width: ${y}em;
        margin: auto;
        border-radius: 70%/110%;
        border-bottom: 0.1em solid #a14907;
        border-top: 0.2em solid #a14907;
      }
      
      .pumpkin .surface:after{
        content: "";
        display: block;
        height: ${f}em;
        width: ${o * (7 / 9)}em;
        margin: auto;
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        border-radius: 70%/110%;
        border-bottom: 0.2em solid #a14907;
        border-top: 0.3em solid #a14907;
      }
      
      .pumpkin .stem{
        background: #517f54;
        height: ${p}em;
        width: ${v}em;
        position: absolute;
        left: calc(50% - ${v / 2}em);
        top: -${p}em;
        -webkit-transform: rotate(5deg);
        transform: rotate(5deg);
        border-radius: 30% 20% 70% 10%;
        z-index: -1;
        box-shadow: inset 0 0px ${z}px #58cb62;
      }
      
      .pumpkin .eye{
        position: absolute;
        width: 0;
        height: 0;
        border-top: ${a}em solid transparent;
        border-bottom: ${d}em solid transparent;
        top: ${S}em;
        box-shadow: ${e === "true" ? "inset 0 0 5px red" : "none"};
      }
      
      .pumpkin .eye.right{
        -webkit-transform: rotate(30deg);
        transform: rotate(30deg);
        right: ${h}em;
        border-left: ${b}em solid ${e === "true" ? "#f6ff91" : "#401d03"};
      }
      
      .pumpkin .eye.left{
        -webkit-transform: rotate(-30deg);
        transform: rotate(-30deg);
        left: ${h}em;
        border-right: ${b}em solid ${e === "true" ? "#f6ff91" : "#401d03"};
      }
      
      .pumpkin .mouth{
        width: ${n}em;
        height: ${g}em;
        position: absolute;
        bottom: ${k}em;
        border-bottom: ${n / 4}em solid ${e === "true" ? "#ffa1a1" : "#401d03"};
      }
      
      .pumpkin .mouth.right{
        right: ${$}em;
        border-radius: 0 0 100% 0;
      }
      
      .pumpkin .mouth.left{
        left: ${$}em;
        border-radius: 0 0 0 100%;
      }
      
      .pumpkin .teeth{
        width: ${w}em;
        height: ${c}em;
        position: absolute;
        bottom: calc(${k}em);
        left: calc(50% + 2px);
        border-top: ${a}em solid transparent;
        border-bottom: 0em solid transparent;
        border-left: ${a}em solid #401d03;
      }
      
      .pumpkin .teeth:before, .pumpkin .teeth:after{
        content: "";
        display: block;
        position: absolute;
        width: 0;
        height: 0;
        border-top: ${a}em solid transparent;
        border-bottom: ${w}em solid transparent;
        border-left: ${c}em solid #401d03;
      }
      
      .pumpkin .teeth:before{
        left: -${n / 1.3}em;
        top: -${g / 2.3}em;
        -webkit-transform: rotate(30deg);
        transform: rotate(30deg);
      }
      
      .pumpkin .teeth:after{
        right: ${n / 5}em;
        top: 0;
        -webkit-transform: rotate(30deg);
        transform: rotate(30deg);
      }
    </style>
    <div id="${i}" class="pumpkin">
      <div class="surface"></div>
      <div class="stem"></div>
      <div class="eye left"></div>
      <div class="eye right"></div>
      <div class="mouth left"></div>
      <div class="mouth right"></div>
      <div class="teeth"></div>
    </div>
  `;
}, E = L, r = class r extends HTMLElement {
  constructor() {
    super(), this.shadowRootEl = this.attachShadow({ mode: "open" });
  }
  // 被监听的属性，是一个静态的数组类型属性
  static get observedAttributes() {
    return ["lighting"];
  }
  attributeChangedCallback(t, e, o) {
    return this.render();
  }
  get lighting() {
    return this.getPropV("lighting");
  }
  set lighting(t) {
    this.setAttribute("lighting", t);
  }
  getPropV(t) {
    return this.hasAttribute(t) && this.getAttribute(t) || void 0;
  }
  connectedCallback() {
    this.render();
  }
  render() {
    const { shadowRootEl: t, lighting: e } = this;
    t.innerHTML = E("miku-pumpkin", { isLighting: e });
  }
};
u(r, "compoName", "k1-pumpkin"), u(r, "register", function() {
  window.customElements.get(r.compoName) || window.customElements.define(r.compoName, r);
});
let x = r;
export {
  x as default
};
