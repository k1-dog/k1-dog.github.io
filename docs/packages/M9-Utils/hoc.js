export default function M9VueHoc ($component) {
  return {
    beforeCreate () { },
    created () { },
    mounted () { },
    updated () { },
    beforeDestroy () { },
    destroyed () { },
    props: $component.props,
    render (h) {
      const keys = Object.keys(this.$slots);
      const children = keys.reduce((arr, key) => arr.concat(this.$slots[key]), []).map(vnode => {
        vnode.context = this._self
        return vnode
      });
      return h($component, {
        on: this.$listeners,
        attrs: this.$attrs,
        props: this.$props,
        scopedSlots: this.$scopedSlots
      }, children)
    }
  }
}

// 作者：zhangwinwin
// 链接：https://juejin.cn/post/6862175878475546638
// 来源：稀土掘金