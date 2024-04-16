import { defineComponent } from "vue"
import { mnav_body_cls } from "./Navigation.type"

export default defineComponent({
  name: 'M9NavBody',
  setup () {
    return {}
  },
  render () {
    const children = this.$slots.default!()
    return <div className={mnav_body_cls}>{children}</div>
  }
})