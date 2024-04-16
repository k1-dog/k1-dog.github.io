import { EmitsOptions, Ref, SetupContext, Slot, VNode } from 'vue'
import { MSelectProps } from '../Select/Select'
import { MCheckBoxInterface as MCheckBoxProps } from '../CheckBox/CheckBox'
import M9MessageXT from '../Message/controller'

// .exmple {
//   key: 'IZayoi~Miku',
//   label: '诱宵美九 - 九姐赛高',
//   value: '' | 0 | undefined,
//   disabled: true | false,
//   required: true | false,
//   disFlexNum: number | undefined,
//   type: 'IPT | SLT | TIME | SWITCH'
// }

export type M9InvalidT = Ref<boolean>

enum ZzFieldTypes {
  'TIME' = 'TIME',
  'IPT' = 'INPUT',
  'SLT' = 'SELECT',
  'FILE' = 'FILE',
  'SWITCH' = 'SWITCH',
  'SLIDER' = 'SLIDER',
  'CBOX-G' = 'CBOX-G',
  'DIVIDER' = 'DIVIDER' // ! 分割线类型的
}

// * 基础字段属性
interface BaseFieldT<BFKey> {
  key: BFKey;
  label: string;
  _class?: string; // ? 自定义域控件类名
  value?: number | string;
  disabled: boolean;
  required: boolean;
  disFlexNum?: number;
  type: keyof typeof ZzFieldTypes;
}

// * 选择框字段属性
interface SelectFieldT {
  options: MSelectProps['options']; // ? 选择框的数据源
  isMulti?: MSelectProps['multiable']; // ? 是否多选 - 默认单选 -false
  isEdit: boolean; // ? 是否开启可输入式选框
  isVirtual?: boolean; // ? 是否开启虚拟滚动
  isFilter: MSelectProps['onFilter']; // ? 是否开启模糊匹配
  optionSlot: Slot; // ? 下拉框数据源的展示形式插槽配置
  valueSlot: Slot; // ? 下拉框顶部 -展示框的展示形式插槽配置
  indicatorSlot: (ZFieldV$: any, ...args: any) => VNode; // ? 下拉框顶部 -展示框的最右侧的 指示按钮插槽配置
}

// * 文件上传域字段属性
interface FilerFieldT {
  // onUpload: M9FileProps['onUpload'];
}

// * 组合输入框字段属性
interface InputFieldT {
  prependSlot: Slot;
  appendSlot: Slot;
  maxLength: number;
  minLength: number;
}

// * 组合复选框字段属性
interface CheckBoxFieldT {
  replaceFields: MCheckBoxProps['replaceFields'];
  options: MCheckBoxProps['options'];
}

// * 最终的 折纸表单 - 单元域属性
export type M9ZzFieldT<ZFKey0> =
  BaseFieldT<ZFKey0>
  & Partial<SelectFieldT>
  & Partial<FilerFieldT>
  & Partial<InputFieldT>
  & Partial<CheckBoxFieldT>

export type M9ZzFormState<ZKeys0> = {
  [ZTK in keyof ZKeys0]?: { initValue: any; isRequired: boolean; };
}

type M9ZzFinalValue<F4> = {
  [FK in keyof F4]?: any;
}

export interface M9ZzFormPropsT<ZKeys0> {
  formModel: {
    [ZZK in keyof ZKeys0]: M9ZzFieldT<ZZK>;
  };
  formRules: {
    [FK in keyof ZKeys0]?: any;
  };
  // CallBackSubmit: (state: M9ZzFinalValue<F>) => void;
}

type onSubmitE = (isFormValid?: boolean) => void;

export interface  M9ZzFormHooksT<ZZKeys0> {
  ['_ctx']: SetupContext<EmitsOptions>;
  ['_props']: Partial<M9ZzFormPropsT<ZZKeys0>>;
  ['state']: M9ZzFormState<ZZKeys0>;
  ['zv$']: any;
  ['$toast']: typeof M9MessageXT;
  ['$globalState']: Map<string, any>;
  __isFirstMount: boolean; // * important~~很重要的标记 _是否挂载过虚拟DOM树 -> 用来更新后续的动态表单的 初始值 (很复杂的一个更新机制)
  useSubmitted: () => [Ref<boolean>, Function];
  onSubmit: onSubmitE;
  _genStateAndRules: () => void;
  _genZV$Ctor: () => void;
  _beforeMount: () => void;
  _mounted: () => void;
  _unmounted: () => void;
  _EffectsWatcher: (props: Partial<M9ZzFormPropsT<ZZKeys0>>) => void;
}


export interface M9FormState {}