import { PropType } from "vue";
declare const _default: import("vue").DefineComponent<{
    type: {
        type: PropType<"error" | "success" | "warning" | "info">;
        default: string;
    };
    text: {
        type: PropType<string>;
        default: string;
    };
    life: {
        type: PropType<number | undefined>;
        default: number;
    };
    messageRoot: {
        type: ObjectConstructor;
        required: false;
    };
}, {
    state: {
        isShow: boolean;
    };
    onClose: ($life: any) => void;
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, "destroy"[], "destroy", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    type: {
        type: PropType<"error" | "success" | "warning" | "info">;
        default: string;
    };
    text: {
        type: PropType<string>;
        default: string;
    };
    life: {
        type: PropType<number | undefined>;
        default: number;
    };
    messageRoot: {
        type: ObjectConstructor;
        required: false;
    };
}>> & {
    onDestroy?: ((...args: any[]) => any) | undefined;
}, {
    type: "error" | "success" | "warning" | "info";
    text: string;
    life: number | undefined;
}, {}>;
export default _default;
