import { PropType, VNode } from 'vue';
type SwitcherSlotsT = string | number | VNode;
export interface MSwitcherProps {
    isOpen: boolean;
    isLoading: boolean;
    size: 'large' | 'small' | 'medium';
    disabled: boolean;
    checkVnode: SwitcherSlotsT;
    uncheckVnode: SwitcherSlotsT;
    onChange: (isOpen: boolean) => void;
    [k: string]: any;
}
declare const _default: import("vue").DefineComponent<{
    modelValue: {
        type: BooleanConstructor;
    };
    isLoading: {
        type: PropType<boolean>;
        default: boolean;
    };
    size: {
        type: PropType<"small" | "medium" | "large">;
        default: string;
    };
    disabled: {
        type: PropType<boolean>;
        default: boolean;
    };
}, {
    state: {
        isOpen: boolean;
    };
    onSwitch: () => void;
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("change" | "update:modelValue")[], "change" | "update:modelValue", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    modelValue: {
        type: BooleanConstructor;
    };
    isLoading: {
        type: PropType<boolean>;
        default: boolean;
    };
    size: {
        type: PropType<"small" | "medium" | "large">;
        default: string;
    };
    disabled: {
        type: PropType<boolean>;
        default: boolean;
    };
}>> & {
    onChange?: ((...args: any[]) => any) | undefined;
    "onUpdate:modelValue"?: ((...args: any[]) => any) | undefined;
}, {
    size: "small" | "medium" | "large";
    disabled: boolean;
    modelValue: boolean;
    isLoading: boolean;
}, {}>;
export default _default;
