import { Ref } from "vue";
export type sizeTypes = 'small' | 'medium' | 'large';
export interface MSpinProps {
    /**
     * @spinning 加载 指定是否为加载状态， 默认为加载中
     * */
    spinning: boolean | undefined;
    /**
     * @size 组件大小，可选值为 small default， large，默认为default
     */
    size?: sizeTypes;
    /**
     * @context 加载显示的内容
     * */
    context?: string;
}
declare const _default: import("vue").DefineComponent<{
    spinning: {
        type: BooleanConstructor;
        default: boolean;
    };
    to: {
        type: FunctionConstructor;
        default: () => undefined;
    };
    size: {
        type: StringConstructor;
        default: string;
    };
    text: {
        type: StringConstructor;
        default: string;
    };
}, {
    SpinRef: Ref<any>;
    SpinLoadingRef: Ref<any>;
    SpinTextRef: Ref<any>;
    SpinInnerRef: Ref<any>;
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    spinning: {
        type: BooleanConstructor;
        default: boolean;
    };
    to: {
        type: FunctionConstructor;
        default: () => undefined;
    };
    size: {
        type: StringConstructor;
        default: string;
    };
    text: {
        type: StringConstructor;
        default: string;
    };
}>>, {
    size: string;
    text: string;
    spinning: boolean;
    to: Function;
}, {}>;
export default _default;
