import CheckboxItem from './CheckboxItem'
import { PropType, defineComponent, h, cloneVNode, onBeforeMount, reactive, watch, VNodeArrayChildren } from 'vue'

export interface MCheckBoxInterface {
  options : any[];

  replaceFields: {
    [key: string] : string
  };
};

interface MCheckBoxProps extends MCheckBoxInterface {
  Item?: typeof CheckboxItem;
};

type MCItem = {
  key: string | number,
  value: any,
  checked: boolean,
  disabled: boolean
};

export interface MCheckBoxState {
  MCItems: MCItem[];

  /**
   * @description [留给二次开发人员 回调时所用到的已选择项目列表]
   */
  checkedItems?: any[];

  // ? 定义全选相关[状态 | 事件]信息
  allCheckState: {
    isChecked: 0 | 1 | 2; // ?  0->未选中 1->已选中 2->半选中
    onAllChecked: (isAll: boolean) => void;
  }
}

const preCls = 'miku-check';

const CheckBox = defineComponent({
  name: 'M9Checkbox',
  props: {
    modelValue: {
      type: Array,
      default: () => []
    },
    options: {
      type: Array as PropType<MCheckBoxProps['options']>,
      default: () => []
    },
    replaceFields: {
      type: Object as PropType<MCheckBoxProps['replaceFields']>,
      default: () => ({ key: 'key', value: 'value' })
    }
  },
  emits: ['change', 'update:modelValue'], // onChange: (MCVS: any) => void;
  setup (props, ctx) {
    const state = reactive<MCheckBoxState>({
      MCItems: [],
      checkedItems: [],
      allCheckState: {
        isChecked: 0,
        onAllChecked: (isAll: boolean) => {
          const { MCItems } = state
          // ! 注意 - 同步更新新全选框的状态值
          state.allCheckState.isChecked = (1 - state.allCheckState.isChecked) % 2 as 0 | 1

          const _mCheckboxItems = MCItems.map(MCItem_ => {
            // !!! 注意 - 禁选状态的不要参与任何逻辑计算
            if (!MCItem_.disabled) {
              MCItem_.checked = Boolean(state.allCheckState.isChecked)
            }
            
            return { ...MCItem_ }
          })
          state.MCItems = _mCheckboxItems
          state.checkedItems = _mCheckboxItems.reduce<MCheckBoxState['MCItems']>(($CheckedArray, MCItem_) => {
            // !!! 注意 - 禁选状态的不要参与任何逻辑计算
            if (!MCItem_.disabled && MCItem_.checked) {
              $CheckedArray.push(MCItem_.value)
            }
            return $CheckedArray
          }, [])

          ctx.emit('change', state.checkedItems)
          ctx.emit('update:modelValue', state.checkedItems)
        }
      }
    })

    function onChecked (MCIKey: MCItem['key']): void {
      const { MCItems, allCheckState } = state
      const _mCheckboxItems = MCItems.map(MCItem_ => {
        if (MCItem_.key === MCIKey) {
          MCItem_.checked = !MCItem_.checked
        }
        return { ...MCItem_ }
      })

      state.MCItems = _mCheckboxItems
      state.checkedItems = _mCheckboxItems.reduce<MCheckBoxState['MCItems']>(($CheckedArray, MCItem) => {
        if (MCItem.checked) {
          $CheckedArray.push(MCItem.value)
        }

        return $CheckedArray
      }, [])

      // ! 注意 - 这边和全选状态信息联动一下 - 处理下现在是不是半选或全选
      // ? 后边把这里改成用 computed 计算属性联动, 可能也不错
      
      // !!! 注意 - 禁选状态的不要参与任何逻辑计算
      const filterDisabledCheckboxItems = MCItems.filter(item => !item.disabled)

      const checkedLength = state.checkedItems.length
      const totalWithoutDisabledLength = filterDisabledCheckboxItems.length
      
      if (checkedLength === 0) {
        // 一点都没选中, 全选状态一定是 0
        allCheckState.isChecked = 0
      } else if (checkedLength !== totalWithoutDisabledLength) {
        // 选中值了, 但是没全选中, 全选状态就是半选 2
        allCheckState.isChecked = 2
      } else {
        // 否则选中值了, 并且全选中, 全选状态就是全选 1
        allCheckState.isChecked = 1
      }

      ctx.emit('change', state.checkedItems)
      ctx.emit('update:modelValue', state.checkedItems)

      return
    }

    onBeforeMount(() => {
      const { options, replaceFields } = props;
      const items = options.map((option, index) => {
        return {
          key: option[replaceFields['key']] ? option[replaceFields['key']] : index,
          value: option[replaceFields['value']],
          checked: false,
          disabled: option.disabled
        }
      })
      state.MCItems = items
    })

    watch(() => props.modelValue, (checkedValue) => {
      state.checkedItems = checkedValue
    })

    return { state, onChecked }
  },
  render () {
    const {
      onChecked,
      state: { MCItems, allCheckState },
      $props: { replaceFields }
    } = this

    const children = this.$slots.default && this.$slots.default()

    console.log('@@@children', children)

    function genMCheckboxItemProps (index) {
      return {
        key: MCItems[index].key,
        mKey: MCItems[index].key,
        value: MCItems[index].value,
        replaceFields,
        checked: MCItems[index].checked,
        disabled: MCItems[index].disabled,
        onChange: onChecked
      }
    }

    return (
      <div className={`${preCls}`}>
        <CheckboxItem
          key="m9-All0-checkbox-key"
          mKey="m9-All0-checkbox"
          checked={allCheckState.isChecked}
          onChange={allCheckState.onAllChecked}
        >全选</CheckboxItem>
        {
          children
          &&
          (children[0].children as VNodeArrayChildren).map((element: any, index) => h(
            element,
            genMCheckboxItemProps(index),
            undefined
          ))
          ||
          MCItems.map((MCItem, index) => h(CheckboxItem, genMCheckboxItemProps(index), MCItem.value))
        }
      </div>
    )
  }
})


CheckBox.Item = CheckboxItem;

export default CheckBox