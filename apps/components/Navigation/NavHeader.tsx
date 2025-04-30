import { defineComponent, reactive } from "vue"
import { mnav_header_cls } from "./Navigation.type"
import Input from "../Input/Input"
import Switch from "../Switch/Switch"
import Select from "../Select/Select"
import Popover from "../Popover/Popover"

export default defineComponent({
  name: 'M9NavHeader',
  emits: ['search'],
  setup (props, ctx) {
    const state = reactive({
      searchValue: null
    })
    function onSearch (sv) {
      ctx.emit('search', sv)
    }
    function onSwitchTheme (m9Theme) {
      const _html = document.documentElement
      if (m9Theme === false) {
        _html.setAttribute('m9-theme', 'dark')
      } else {
        _html.setAttribute('m9-theme', 'light')
      }
    }

    return { state, onSearch, onSwitchTheme }
  },
  render () {
    const { state, onSearch, onSwitchTheme } = this
    return (
      <div className={mnav_header_cls}>
        <div className={`${mnav_header_cls}-left`}>
          <img className={`${mnav_header_cls}-left__logo`} src="/miku-logo.webp"></img>
          <span className={`${mnav_header_cls}-left__text`}>K1-Miku</span>
        </div>
        <div className={`${mnav_header_cls}-mid`}>
          <Input v-model={state.searchValue} onChange={onSearch}/>
        </div>
        <div className={`${mnav_header_cls}-right`}>
          <div className={`${mnav_header_cls}-right__switchSunMoon`}>
            {/* 🌞|🌙 */}
            <Switch onChange={onSwitchTheme}>
              {
                {
                  checkVnode: () => '🌞',
                  uncheckVnode: () => '🌙'
                }
              }
            </Switch>
          </div>
          <Popover position="left">
            {
              {
                default: () => <img className={`${mnav_header_cls}-right__avatar`} src="/miku-logo.webp"></img>,
                content: () => (
                  <div className={`${mnav_header_cls}-right__avatar-modal`}>
                    <div className='nickname'>诱宵美九</div>
                    <div className='desc'>精灵偶像-百合九</div>
                    <div className='language'>
                      <Select options={[{ label: '中-(zh)', value: 'zh' }, { label: '英-(en)', value: 'en' }]} onFilter={(eachOption, sv) => eachOption.MSVal.includes(sv)}></Select>
                    </div>
                    <div className='logout' onClick={() => {}}>退出</div>
                  </div>
                )
              }
            }
          </Popover>
        </div>
      </div>
    )
  }
})