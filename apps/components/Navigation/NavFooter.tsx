import { defineComponent } from "vue"
import { mnav_footer_cls } from "./Navigation.type"

export default defineComponent({
  name: 'M9NavFooter',
  setup () {
    return {}
  },
  render () {
    return <div className={mnav_footer_cls}>Copyright © 2024-kego 美九未来 妖苏时刻</div>
  }
})