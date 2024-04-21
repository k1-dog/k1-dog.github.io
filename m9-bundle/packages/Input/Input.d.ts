import { PropType, VNode } from 'vue';
export interface MInputProps {
    /**
     * @description input 输入框大小
     */
    size: 'latge' | 'small' | 'medium';
    /**
     * @description input输入框的受控值1
     */
    value: string;
    /**
     * @description prepend [<-input框前置元素<-]
     */
    prepend: string | VNode;
    /**
     * @description append [->input框后置元素->]
     */
    append: string | VNode;
    /**
     * @description disable 禁用标志
     */
    disabled: boolean;
    customIcon: string;
    /**
     * @description 受控值的变化回调函数
     */
    onChange: (e: string) => void;
    /**
     * @description input 失焦回调
     */
    onBlur: (e: Event) => void;
    /**
     * @description input 聚焦回调
     */
    onFocus: (e: Event) => void;
}
declare const _default: import("vue").DefineComponent<{
    modelValue: {
        type: PropType<string>;
        default: string;
    };
    size: {
        type: PropType<"small" | "medium" | "latge">;
        default: string;
    };
    disabled: {
        type: PropType<boolean>;
        default: boolean;
    };
    customIcon: {
        type: PropType<string>;
        default: string;
    };
}, {
    handleBlur: (e: Event) => void;
    handleFocus: (e: Event) => void;
    handleChange: (e: Event) => void;
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("blur" | "change" | "focus" | "update:modelValue")[], "blur" | "change" | "focus" | "update:modelValue", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    modelValue: {
        type: PropType<string>;
        default: string;
    };
    size: {
        type: PropType<"small" | "medium" | "latge">;
        default: string;
    };
    disabled: {
        type: PropType<boolean>;
        default: boolean;
    };
    customIcon: {
        type: PropType<string>;
        default: string;
    };
}>> & {
    onBlur?: ((...args: any[]) => any) | undefined;
    onChange?: ((...args: any[]) => any) | undefined;
    onFocus?: ((...args: any[]) => any) | undefined;
    "onUpdate:modelValue"?: ((...args: any[]) => any) | undefined;
}, {
    size: "small" | "medium" | "latge";
    disabled: boolean;
    modelValue: string;
    customIcon: string;
}, {}>;
export default _default;
