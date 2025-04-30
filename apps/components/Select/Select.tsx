import { defineComponent, reactive, ref, PropType, Ref, onBeforeMount, onMounted, onBeforeUnmount, watch, nextTick, computed } from "vue"

import MikuTrans from '../Transtions/index.js'
import M9Icon from '@k1/styles/assets/_'
import { __on, __off, HangRoot } from '@k1/utils'

import {
  preCls, mselect_inner_preCls, mselect_inner_arrowCls, mselect_options_preCls,
  mselect_filter_search__input, mselect_options_row_ctt, mselect_options_row_yes,
  is_opt_mselected_cls, mselect_multi_wrapper, mselect_multi_wrapper_item,
  mselect_multi_wrapper_item_ctt, mselect_multi_wrapper_item_close
} from './ms-cls.cjs'
import CheckBox from "../CheckBox/CheckBox.js"
import VScroller from "../VScroller/VScroller.js"

const CheckboxItem = CheckBox.Item

const { Expand } = MikuTrans

type MS_OPT = { MSVal: number | string, MSLabel: any, selected: boolean }

type MS_OPTS = MS_OPT[]

export interface MSelectProps {
  /**
   * @description 下拉框中 内容合集 [字符数组类型]
   */
  options: Array<{ label: string, value: any }>;

  /**
   * @description 开启多选标记
   */
  multiable?: boolean;

  /**
   * @description 开启过滤筛选开关
   */
  filterable?: boolean;

  replaceFields: { value: string; label: string };

  /**
   * @description 实现双向数据绑定的回调
   */
  onSelect?: (select: MS_OPT | MS_OPTS) => void;
  
  /**
   * @description 开启__filter-option__属性时::需要传递一个过滤回调Fn
   */
  onFilter?: (opt: MS_OPT, searchV: string) => boolean | void;
};

interface MSelectState {
  /**
   * @description 下拉框显示标记
   */
  selectPanelVisible : boolean;

  /**
   * @description 下拉框组件中 内部输入框的值
   */
  innerVal ?: MS_OPT;

  /**
   * @description 多选状态时的值组
   */
  valGroup ?: MS_OPTS;
  
  /**
   * @see 下拉选择框__STAT__位置、宽度元素信息
   */
  select$stat: object;

  /**
   * @see 美九下拉框__内部下拉选项的<值组>__维护机
   */
  options_1: MS_OPTS;
};


export default defineComponent({
  name: 'M9Select',
  props: {
    modelValue: { type: [Array, String] },
    options: { type: Array as PropType<MSelectProps['options']>, default: () => [] },
    multiable: { type: Boolean, default: false },
    filterable: { type: Boolean, default: true },
    replaceFields: {
      type: Object as PropType<MSelectProps['replaceFields']>,
      default: () => ({ value: 'value', label: 'label' })
    },
    onFilter: { type: Function as PropType<MSelectProps['onFilter']>, default: () => true }
  },
  emits: ['select', 'filter', 'update:modelValue'],
  setup (props, ctx) {
    const selectRef: Ref<HTMLElement | null> = ref(null)
    const optionsPanelRef : Ref<HTMLElement | null> = ref(null)
    const optionsPanelViewportRef : Ref<HTMLElement | null> = ref(null)
    let options_0: MS_OPTS = {} as MS_OPTS
    const state: any = reactive({
      innerVal: null,
      selectPanelVisible: false,
      select$stat: {},
      valGroup: [],
      options_1: [],
      filteringV: undefined
    })

    onBeforeMount(() => {
      const PumpkinPromiser = (async function () { return (await import('../../utils/web-components/pumpkin.js')).default })()
      PumpkinPromiser.then(PumpkinBooter => { PumpkinBooter.register() })

      _initSelectWithProps(props.options)
    })

    function onCloseSelectPanel(e: Event) {

      const selector = selectRef.value
      const optionsPanel = optionsPanelRef.value
      const clickingEle = e.target as HTMLElement
      
      _4ot_Correct_Area(clickingEle, selector, optionsPanel) && onOpenSelectPanel(false)
    }

    function _4ot_Correct_Area(clickingEle: HTMLElement | null, selector: HTMLElement | null, optionsPanel: HTMLElement | null) {
      if (!selector) return true

      let isNotInArea = false
      isNotInArea = isNotInArea || !selector.contains(clickingEle)
      
      if (optionsPanel) {
        isNotInArea = isNotInArea && !optionsPanel.contains(clickingEle)
      }
      return isNotInArea
    }

    function onOpenSelectPanel (
      cur_visible: boolean,
      // ext_setting_state?: Pick<MSelectState, Exclude<keyof MSelectState, 'selectPanelVisible'>>
    ) {
      const visible_ = cur_visible

      state.selectPanelVisible = visible_
      
      state.select$stat = calcSelectPanelDomStat()
    };

    // * 根据传入的初始选项数据源, 重铸成 M9Select 所需的选项数据源 options0 (这个是持久化不变的那个整合选项源)
    function rebuild_the_options0 (initialOptions: MSelectProps['options'], replaceFields: MSelectProps['replaceFields']) : MS_OPTS {
      const _m9Select_options = initialOptions.map((_option, _i) => {
        return {  MSVal: _option[replaceFields['value']], MSLabel: _option[replaceFields['label']], selected: false }
      })

      return _m9Select_options
    };
    // * 将当前 被选中的数据提取出来 - 与 - 剩余的未被选中的数据 重新合并成
    function Merge_S0_S1_IntoOptions0 (the_s1_item: MS_OPT | MS_OPTS): MS_OPTS {
      // ? $0-1::当前_可视选项_的内部维护表_01
      const NeedViewPortOptions1 = [...state.options_1]
      // ! 优化一下 - 用 Map结构 空间换时间
      let options1Map: any = new Map()
      NeedViewPortOptions1.forEach(opt1 => {
        options1Map.set(opt1.MSVal, 1)
      })

      let sortOptions0IndexMap: any = new Map()
      options_0.forEach((opt, i) => {
        sortOptions0IndexMap.set(opt.MSVal, i)
      })

      // ? 选择器组件内部_全表选项_00
      const NotViewPortOptions0 = options_0
      // ? 筛选出__非可视区__的|>选项维护表<|
      .filter(opt0 => !options1Map.has(opt0.MSVal))

      // ! 用提取出的 本轮没参与选择逻辑的 options0- 合并 -当前最新的options1 生成全新的 options0整表选项, 覆盖老的options0 保持副本同步
      let merge_s0_s1_list = [...NotViewPortOptions0, ...NeedViewPortOptions1]
      // 如果当前选择框__维护的选值类型为数组--说明是多选模式::不用处理其他选值状态
      if (!Array.isArray(the_s1_item)) {
        // 单选模式下--要处理其他选值状态
        merge_s0_s1_list.forEach(_s01 => {
          if (_s01.MSVal !== the_s1_item.MSVal) { _s01.selected = false }
          else { _s01.selected = true }
        })
      }

      options1Map.clear()
      options1Map = null

      const reSortMergeOptions0: MS_OPTS = []
      merge_s0_s1_list.forEach((mOpt) => {
        const i = sortOptions0IndexMap.get(mOpt.MSVal)
        reSortMergeOptions0[i] = mOpt
      })

      sortOptions0IndexMap.clear()
      sortOptions0IndexMap = null

      return reSortMergeOptions0
    };

    function onHandleSelect (e : Event) {
      e.preventDefault()
      // 点击判断 是否为委托者本身 是则跳过处理步骤
      if (e.target === e.currentTarget) return ;
      // 事件委托 选择选中内容
      const { options_1: cloneOptions1 } = state
  
      const s1_obj = cloneOptions1.find(opt$1 => opt$1.MSVal == (e.target as any).dataset.msk)
  
      if (!s1_obj) return ; // ? 可能没找到--目标选项~~直接终止处理流程
      s1_obj.selected = true
  
      cloneOptions1
        .filter(o1_obj => o1_obj.MSVal !== s1_obj.MSVal)
        .forEach(filtered_o1_obj => filtered_o1_obj.selected = false)
      
      state.innerVal = s1_obj
      state.options_1 = cloneOptions1

      nextTick(() => {
        options_0 = Merge_S0_S1_IntoOptions0(s1_obj)
        props.onSelect?.(state.innerVal)
        ctx.emit('update:modelValue', state.innerVal)
      })
    }
  
    function onMultiSelect (e: Event) {
      e.preventDefault()
      if (e.target === e.currentTarget) return ;
      state.valGroup = (() => {
        const { valGroup: oldValGroup, options_1 } = state
        const NewMSK = (e.target as any).dataset.msk
        const the_new_mskv = options_1.find(opt$1 => opt$1.MSVal == NewMSK)
        if (!the_new_mskv) return oldValGroup; // ? @see 可能没找到--目标选项~~直接终止处理流程
        if (oldValGroup) {
          const _the_select_its_idx_ = oldValGroup.findIndex(old_KV => old_KV.MSVal == NewMSK)
          if (_the_select_its_idx_ < 0) {
            the_new_mskv.selected = true
            oldValGroup.push(the_new_mskv)
          } else {
            // ! _the_select_its_idx_ = -1, 说明之前已选中--重复选中时, 当前逻辑就是删除功能
            the_new_mskv.selected = false
            oldValGroup.splice(_the_select_its_idx_, 1)
          }
  
          return oldValGroup
        } else { return oldValGroup }
      })()

      props.onSelect?.(state.valGroup!)
      ctx.emit('update:modelValue', state.valGroup)
    }

    watch(() => props.modelValue, (newSelectedItems) => {
      if (props.multiable) {
        state.valGroup = newSelectedItems
      } else {
        state.innerVal = newSelectedItems
      }
    })
  
    // * 目前这个-<_删除选项_>-的方法__暂只支持--多选模式--的选项删除?
    function onDeleteSelect (the_deletting_its_el_ctx: Event) {
      // ? 获取__事件触发的|>起源元素
      const clickingEle: any = the_deletting_its_el_ctx.target
      // ? 获取__事件触发的|>最终捕获元素
      const checkingEle = the_deletting_its_el_ctx.currentTarget
  
      if (clickingEle === checkingEle) return;
  
      if (!('closev' in clickingEle.dataset) || !clickingEle.classList.contains('ms-closing')) { return; }
  
      const the_deletting_its_MSVal = clickingEle.dataset.closev
        
      state.valGroup = (()=> {
        const { valGroup: oldValGroup } = state
        if (!!oldValGroup) {
          const itemIndex = oldValGroup.findIndex(_oval => _oval.MSVal == the_deletting_its_MSVal)
          if (itemIndex > -1) {
            // ? 触发关闭逻辑后,给待清除目标的__selected__标记位置::false
            oldValGroup[itemIndex].selected = false
            oldValGroup.splice(itemIndex, 1)
          }
          return oldValGroup
        } else { return undefined }
      })()

      nextTick(() => {
        options_0 = Merge_S0_S1_IntoOptions0(state.valGroup!)
        props.onSelect?.(state.valGroup!)
      })
    }

    function onChangeFilteringV (filteringVal?: String) {
      state.filteringV = filteringVal
    }

    function onFilterOptions(filteringVal?: String) {
      onOpenSelectPanel(true)
      if (!filteringVal) {
        state.options_1 = options_0
        return void 0
      }
  
      const { onFilter } = props
  
      // * 用过滤函数筛选新可视选项 - 赋值给可视数组 options1
      const _filteredOptions = options_0.filter(opt => onFilter?.(opt, filteringVal))
      state.options_1 = _filteredOptions
    }
  
    function renderMultiSelectX (playValueGroup: MSelectState['valGroup']): Element {
  
      const ms_multi_X = <div className={mselect_multi_wrapper} onClick={onDeleteSelect}>
        {
          playValueGroup?.map(val => (
          <div className={mselect_multi_wrapper_item} key={`MSelect-MMVal-${val.MSVal}`}>
            <span className={mselect_multi_wrapper_item_ctt}>{ val.MSLabel }</span>
            <span className={mselect_multi_wrapper_item_close}>
              <M9Icon icon="close" style={{ width: '1.2rem', height: '1.2rem', color: 'var(--element-active-borderClr)' }} data-closev={val.MSVal} />
            </span>
          </div>
          ))
        }
        <p>...... 总共 <span style="color: red; font-size: 1rem;">{state.valGroup.length}</span> 条项目</p>
      </div>
  
      return ms_multi_X
    }
  
    function _initSelectWithProps(_initOptions: MSelectProps['options']) {
      updateSelectorWithProps(_initOptions)
    }
  
    function updateSelectorWithProps(_options: MSelectProps['options']) {
      const { multiable, replaceFields } = props
      options_0 = rebuild_the_options0(_options, replaceFields)
      options_0[0].selected = true

      state.innerVal = options_0[0]
      if (multiable) {
        state.valGroup = [options_0[0]]
      }
      state.options_1 = options_0
      state.innerVal = options_0[0]
  
      onOpenSelectPanel(false)
    }

    // * 点击区域之外--自动关闭||收起下拉框面板 回调事件销毁
    function _Ev_Destroy_Area() { __off(document, 'click', onCloseSelectPanel) }

    // * 点击区域之外--自动关闭||收起下拉框面板 回调事件注册
    function _Ev_Create_Area() { __on(document, 'click', onCloseSelectPanel) }
    
    onMounted(() => { _Ev_Create_Area() })

    onBeforeUnmount(() => { _Ev_Destroy_Area() })

    // onUpdated(() => { updateSelectorWithProps(props.options) })

    // * 计算下拉框面板元素弹出时 - 正确的DOM位置及尺寸信息
    function calcSelectPanelDomStat() {
      if (!selectRef.value) return {}
      const offsetY = window.scrollY
      const offsetX = window.scrollX
      const { width, left, right, bottom } = selectRef.value.getBoundingClientRect()
      return { width: width + 'px', left: left + offsetX + 'px', right: right + 'px', top: bottom + offsetY + 'px' }
    }

    watch(() => state.selectPanelVisible, (isSelectPanelVisible) => {
      if (isSelectPanelVisible) {
        state.select$stat = calcSelectPanelDomStat()
      }
    })
    watch(() => state.options, (newOptions) => {
      updateSelectorWithProps(newOptions)
    })

    const isSelectAll = computed(() => {
      const selectedLength = state.valGroup.length
      const allLength = state.options_1.length
      const _isSelectAll = selectedLength === 0 ? 0 : selectedLength < allLength ? 2 : 1
      return _isSelectAll
    })

    function onSelectAll () {
      const value = Number(isSelectAll.value !== 1 ? 1 : 0)
      state.options_1.forEach(everyOption => {
        everyOption.selected = value
      })
      if (value) {
        state.valGroup = [...state.options_1]
      } else {
        state.valGroup = []
      }
      state.options_1 = [...state.options_1]
    }

    // ! 多选模式下 - 如果被选中的条目太多 - 全部显示到选择框里, 太难看 - 而且性能不佳, 默认最多显示6个, 剩下的截取显示总数
    const playValueGroup = computed(() => {
      const limitLength = 6
      const _vGroup = state.valGroup
      const _playVGroup = _vGroup.slice(0, limitLength)
      return _playVGroup
    })

    return {
      state,
      selectRef,
      optionsPanelRef,
      optionsPanelViewportRef,
      isSelectAll,
      onSelectAll,
      onMultiSelect,
      onHandleSelect,
      onFilterOptions,
      onChangeFilteringV,
      onOpenSelectPanel,
      renderMultiSelectX,
      rowHeight: 30,
      playValueGroup
    }
  },
  render() {
    const { multiable, filterable } = this.$props
    const { options_1, innerVal = {}, selectPanelVisible, filteringV } = this.state
    const { playValueGroup, isSelectAll, onSelectAll, renderMultiSelectX, onFilterOptions, onChangeFilteringV, onOpenSelectPanel, onMultiSelect, onHandleSelect } = this

    return (
      <>
        <div className={preCls} ref={(_sr_) => this.selectRef = _sr_ }>
        <div className={mselect_inner_preCls(this.$props)}>
          {
            multiable ? renderMultiSelectX(playValueGroup) :<span>{innerVal.MSLabel}</span>
          }
          <div>
            <span
              className={mselect_inner_arrowCls}
              onClick={e => onOpenSelectPanel(!selectPanelVisible)}
            ><k1-pumpkin lighting={selectPanelVisible}></k1-pumpkin></span>
          </div>
        </div>
        </div>
        <HangRoot>
          <Expand
            duration2={5000}
            isRun={selectPanelVisible}
            style={{ ...this.state.select$stat, position: 'relative' }}
          >
            <div className={mselect_options_preCls} ref={(optionsPanelR) => this.optionsPanelRef = optionsPanelR}>
              {filterable && <FILTER_OPTIONS_INPUT filteringV={filteringV} onRunFilter={onFilterOptions} onChangeFilteringV={onChangeFilteringV}/>}
              <div ref={(optionsPanelViewportR) => this.optionsPanelViewportRef = optionsPanelViewportR} className={`${mselect_options_preCls}--viewport`} onClick={multiable ? onMultiSelect : onHandleSelect}>
                <VScroller vsElement={() => this.optionsPanelViewportRef} vsUnitHeight={this.rowHeight} data={options_1}>
                  {
                    {
                      default: (vsData: MSelectState['options_1']) => {
                        return (
                          <div>
                            {
                              vsData.map(opt => (
                                <div style={{ height: `${this.rowHeight}px` }} className={is_opt_mselected_cls(opt)} key={`select-opt-${opt.MSVal}`}>
                                  {multiable && <CheckboxItem mKey={opt.MSVal} checked={Number(opt.selected)}></CheckboxItem>}
                                  <p className={mselect_options_row_ctt} data-msk={opt.MSVal}>
                                    { opt.MSLabel }
                                  </p>
                                  <span className={mselect_options_row_yes} data-msk={opt.MSVal}>
                                    {
                                      opt.selected ? <M9Icon icon="checked" style={{ width: '1.5rem', height: '1.5rem', color: '#3eeb5b', display: 'flex' }} /> : null
                                    }
                                  </span>
                                </div>
                              ))
                            }
                          </div>
                        )
                      }
                    }
                  }
                </VScroller>
              </div>
              {
                multiable
                &&
                <div style="margin-top: 0.5rem;padding-top: 0.5rem;border-top: 1px solid var(--element-active-borderClr)">
                  <CheckboxItem mKey='MMS-ALL' checked={isSelectAll} onChange={onSelectAll}>全选</CheckboxItem>
                </div>
              }
            </div>
          </Expand>
        </HangRoot>
      </>
    )
  }
})

/**
 * @function [FILTER_OPTIONS_INPUT]
 * @param { MSelectProps['onFilter'] } _onFilter
 * @description <>[纯函数组件渲染__===__模糊搜索框]<>
 * @return { React.FC<MSelect_Filter_Input_Props> }
 */

type MM_filter_options_props = { onRunFilter: (filter_val: string | undefined) => void } & { filteringV?: string, onChangeFilteringV: (search_val: string) => void }

const FILTER_OPTIONS_INPUT = (props: MM_filter_options_props) => {
  const { filteringV, onChangeFilteringV, onRunFilter } = props // innerInputtedVal
  const set_filteringVal = (_filteringVal) => onChangeFilteringV(_filteringVal)

  const onChangeFilteringValueFromInputor = (inputting_text: HTMLInputElement['value']) => {
    const _filteringVal = inputting_text
    set_filteringVal(_filteringVal)
  }

  // function onBlurHandle () {
  //   nextTick(() => {
  //     if (!filteringVal.value) {
  //       set_filteringVal(innerInputtedVal)
  //     }
  //   })
  // }

  // ! (innerInputtedVal 原选择输入框内的值发生变化时, 联动模糊搜索值 filteringVal变化)
  // ! 失焦事件 与 变化事件 几乎同时执行, 失焦事件略晚执行, 但由于vue响应式的合并策略, 一个值多次变化时, 只取最后一次更新, 所以可能就是空值, 影响后边逻辑
  // watchEffect(() => { set_filteringVal(props.innerInputtedVal) })
  
  return (
    <div className={mselect_filter_search__input}>
      <input
        value={filteringV}
        onChange={(e) => { onChangeFilteringValueFromInputor(e.target.value) }}
        // onBlur={onBlurHandle}
      />
      <M9Icon onClick={() => { onRunFilter(filteringV) }} icon="search" style={{ width: '1.5rem', height: '1.5rem' }} /> 
    </div>
  );
}