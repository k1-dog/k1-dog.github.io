import className from 'classnames'
import M9Icon from '@k1/styles/assets/_'
import { PropType, defineComponent } from 'vue'

export interface MCheckItemProps {

  disabled: boolean

  replaceFields: { [key: string] : string }
}

type PMCheckItemProps = {
  /**
   * @description [是否选中]
   */
  checked: boolean | 0 | 1 | 2

  key__: string | number
} & Partial<MCheckItemProps>

const preCls = 'miku-check'

export default defineComponent({
  name: 'M9CheckboxItem',
  props: {
    disabled: {
      type: Boolean as PropType<PMCheckItemProps['disabled']>,
      default: false
    },
    replaceFields: {
      type: Object as PropType<PMCheckItemProps['replaceFields']>,
      default: () => ({})
    },
    checked: {
      type: [Boolean, Number] as PropType<PMCheckItemProps['checked']>,
      default: false
    },
    mKey: {
      type: String as PropType<PMCheckItemProps['key__']>,
      default: 'key'
    },
    value: {
      type: [Number, String, Object],
      required: false,
      default: null
    }
  },
  emits: ['change'], // (MKey: PMCheckItemProps['key__']) => void
  setup (props, ctx) {
    function onItemChange ($k) {
      ctx.emit('change', $k)
    }

    return { onItemChange }
  },
  render () {
    const { onItemChange } = this
    const { mKey, value, disabled, checked } = this.$props
    const itemPreCls = `${preCls}__item`
    const itemCheckboxCls = `${itemPreCls}-checkbox`
    const itemCheckboxExtraCls = className(
      itemCheckboxCls,
      {
        [`${itemCheckboxCls}--checked`]: checked !== 0 && checked !== false,
        [`${itemCheckboxCls}--disabled`]: disabled
      }
    )

    // ! 注意 - 判断是否是半选状态
    const isHalfChecked = checked === 2

    const children = this.$slots.default && this.$slots.default()
    return (
      <div className={itemPreCls}>
        <div className={itemCheckboxExtraCls}>
          <input type="checkbox" className={`${itemCheckboxCls}__inner`} id={`m9-checkbox-${mKey}`}></input>
          <label for={`m9-checkbox-${mKey}`} className={`${itemCheckboxCls}__label`} onClick={($e) => { onItemChange(mKey) }}>
          {
            disabled
            &&
            <M9Icon icon="ban" style="width: 100%; height: 100%; color: orange;"/>
            ||
            <M9Icon icon="doraamon" style="width: 100%; height: 100%;"/>
          }
          </label>
          <div className={`${itemCheckboxCls}__input`} onClick={($e) => { onItemChange(mKey) }}>
          {
            [
              isHalfChecked && <div style="width: 80%; height: 2px; background-color: #ffffff; "></div>,
              !isHalfChecked && checked && <M9Icon icon="checked" style="width: 100%; height: 100%; color: white; display: flex;"/>
            ]
          }
          </div>
        </div>

        <div className={`${itemPreCls}-ctt`}>
          {children || value}
        </div>
      </div>
    )
  }
})