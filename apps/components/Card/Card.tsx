
import classNames from 'classnames'
import Button from '../Button/index'
import useAutoResizeIMG from './useAutoResizeIMG'
import { M9CardProps, M9CardState } from './Type'
import { PropType, defineComponent, reactive, ref, onMounted, nextTick, onBeforeUnmount } from "vue"
import kotoriPNG from '@k1/styles/assets/image/kotori_01.webp'
import { M9Dragger, M9Editor } from '@k1/utils'

export default defineComponent({
  name: 'M9Card',
  props: {
    title: {
      type: String as PropType<M9CardProps['title']>,
      default: ''
    },
    tabKey: {
      type: String as PropType<M9CardProps['tabKey']>,
      default: ''
    },
    imgUrl: {
      type: String as PropType<M9CardProps['imgUrl']>,
      default: kotoriPNG
    }
  },
  setup (props, ctx) {
    const imgRef = ref()
    const cardRef = ref()
    const headRef = ref()
    const bodyRef = ref()
    const headTitleRef = ref()
    const state = reactive<M9CardState>({ collapse: false, activeTabKey: '' })

    useAutoResizeIMG(props, imgRef)

    function onCollapse () {
      state.collapse = !state.collapse
      const cardEle = cardRef.value
      if (state.collapse) {
        cardEle.style.width = _AnimationArgs.collapseWidth + 'px'
        cardEle.style.height = _AnimationArgs.collapseHeight + 'px'
      } else {
        cardEle.style.width = _AnimationArgs.expandWidth + 'px'
        cardEle.style.height = _AnimationArgs.expandHeight + 'px'
      }
    }

    let _AnimationArgs = { collapseWidth: 0, collapseHeight: 0, expandWidth: 0, expandHeight: 0 }
    let _$m9Editor: null | M9Editor = null
    onMounted(() => {
      // 收集卡片宽高信息 - 用以后续的折叠与展开动画参数的设置
      const cardEle = cardRef.value
      _AnimationArgs.expandWidth = cardEle.scrollWidth
      _AnimationArgs.expandHeight = cardEle.scrollHeight

      const headerEle = headRef.value
      const headerTitleEle = headTitleRef.value
      _AnimationArgs.collapseWidth = headerTitleEle.scrollWidth + 16 * 2
      // 这里的 卡片元素的 paddingTop 获取不到, 不知神马情况
      _AnimationArgs.collapseHeight = headerEle.scrollHeight + cardEle.style.paddingTop // 折叠后的缩小高度, 包括card卡片的内上边距
      nextTick(() => {
        _$m9Editor = M9Editor({ $dom: bodyRef.value })
      })
    })

    onBeforeUnmount(() => {
      if (_$m9Editor !== null) {
        _$m9Editor.__destruction()
        _$m9Editor = null
      }
    })

    return {
      imgRef,
      cardRef,
      headRef,
      bodyRef,
      headTitleRef,
      state,
      onCollapse
    }
  },
  render () {
    const { onCollapse } = this
    const { activeTabKey, collapse } = this.state
    const { title, tabKey, imgUrl } = this.$props
    const { default: _default, title: _title, footer: _footer, description: _desc } = this.$slots
    const preCls = 'miku-card'
    const cardCls = classNames(preCls, { 'iscollapse': collapse })
    return (
      <div className={cardCls} ref={($cardRef) => this.cardRef = $cardRef}>
        {/* 卡片头部结构 */}
        <div className={`${preCls}__header`} ref={($hRef) => this.headRef = $hRef}>
          <div className={`${preCls}__header--title`} ref={($htRef) => this.headTitleRef = $htRef}>
            { _title ? _title() || null : title }
          </div>
          <div className={`${preCls}__header--collapse`}>
            <Button type="pure" shape="square" size="small" onClick={onCollapse}>{ collapse ? '展开' : '收起' }</Button>
          </div>
        </div>
        {/* 卡片主体结构 */}
        <div className={`${preCls}__body`}>
          { imgUrl && <img className={`${preCls}__body--img`} src={imgUrl} ref={($imgr => this.imgRef = $imgr)}></img> || null }
          <div className={`${preCls}__body--content`} ref={($bodyr) => this.bodyRef = $bodyr}>
            { _default && _default() || null }
          </div>
        </div>
        {/* 卡片尾部结构 */}
        <div className={`${preCls}__footer`}>
          <div className={`${preCls}__footer--description`}>
            { _desc && _desc() || null }
          </div>
          <M9Dragger isRight>
            <div className="divider vertical"></div>
          </M9Dragger>
          <div className={`${preCls}__footer--foot`}>
            { _footer && _footer() || null }
          </div>
        </div>
      </div>
    )
  }
})