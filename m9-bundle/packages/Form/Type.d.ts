import { EmitsOptions, Ref, SetupContext, Slot, VNode } from 'vue';
import { MSelectProps } from '../Select/Select';
import { MCheckBoxInterface as MCheckBoxProps } from '../CheckBox/CheckBox';
import M9MessageXT from '../Message/controller';
export type M9InvalidT = Ref<boolean>;
declare enum ZzFieldTypes {
    'TIME' = "TIME",
    'IPT' = "INPUT",
    'SLT' = "SELECT",
    'FILE' = "FILE",
    'SWITCH' = "SWITCH",
    'SLIDER' = "SLIDER",
    'CBOX-G' = "CBOX-G",
    'DIVIDER' = "DIVIDER"
}
interface BaseFieldT<BFKey> {
    key: BFKey;
    label: string;
    _class?: string;
    value?: number | string;
    disabled: boolean;
    required: boolean;
    disFlexNum?: number;
    type: keyof typeof ZzFieldTypes;
}
interface SelectFieldT {
    options: MSelectProps['options'];
    isMulti?: MSelectProps['multiable'];
    isEdit: boolean;
    isVirtual?: boolean;
    isFilter: MSelectProps['onFilter'];
    optionSlot: Slot;
    valueSlot: Slot;
    indicatorSlot: (ZFieldV$: any, ...args: any) => VNode;
}
interface FilerFieldT {
}
interface InputFieldT {
    prependSlot: Slot;
    appendSlot: Slot;
    maxLength: number;
    minLength: number;
}
interface CheckBoxFieldT {
    replaceFields: MCheckBoxProps['replaceFields'];
    options: MCheckBoxProps['options'];
}
export type M9ZzFieldT<ZFKey0> = BaseFieldT<ZFKey0> & Partial<SelectFieldT> & Partial<FilerFieldT> & Partial<InputFieldT> & Partial<CheckBoxFieldT>;
export type M9ZzFormState<ZKeys0> = {
    [ZTK in keyof ZKeys0]?: {
        initValue: any;
        isRequired: boolean;
    };
};
export interface M9ZzFormPropsT<ZKeys0> {
    formModel: {
        [ZZK in keyof ZKeys0]: M9ZzFieldT<ZZK>;
    };
    formRules: {
        [FK in keyof ZKeys0]?: any;
    };
}
type onSubmitE = (isFormValid?: boolean) => void;
export interface M9ZzFormHooksT<ZZKeys0> {
    ['_ctx']: SetupContext<EmitsOptions>;
    ['_props']: Partial<M9ZzFormPropsT<ZZKeys0>>;
    ['state']: M9ZzFormState<ZZKeys0>;
    ['zv$']: any;
    ['$toast']: typeof M9MessageXT;
    ['$globalState']: Map<string, any>;
    __isFirstMount: boolean;
    useSubmitted: () => [Ref<boolean>, Function];
    onSubmit: onSubmitE;
    _genStateAndRules: () => void;
    _genZV$Ctor: () => void;
    _beforeMount: () => void;
    _mounted: () => void;
    _unmounted: () => void;
    _EffectsWatcher: (props: Partial<M9ZzFormPropsT<ZZKeys0>>) => void;
}
export interface M9FormState {
}
export {};
