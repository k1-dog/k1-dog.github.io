import { PropType } from "vue";
declare const _default: import("vue").DefineComponent<{
    modelValue: {
        type: PropType<boolean>;
        default: boolean;
    };
    title: {
        type: PropType<string | import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
            [key: string]: any;
        }>>;
    };
    placement: {
        type: PropType<"left" | "top" | "right" | "bottom" | undefined>;
        default: undefined;
    };
}, {
    mount_info: {
        is_mount: boolean;
        is_drawer: boolean;
        id: number;
        zIndex: number;
    };
    m9DraggerRef: import("vue").Ref<any>;
    modalRef: import("vue").Ref<any>;
    modalHeadRef: import("vue").Ref<any>;
    state: {
        isShow: boolean;
        zoomValue: boolean;
    };
    onOk: () => void;
    onClose: () => void;
    onZoomChange: () => void;
    onDragModalHeader: ($modalHeadRef: any) => void;
    onDragModalEndHandler: (callbackDragArgs: any) => void;
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("close" | "update:modelValue" | "ok")[], "close" | "update:modelValue" | "ok", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    modelValue: {
        type: PropType<boolean>;
        default: boolean;
    };
    title: {
        type: PropType<string | import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
            [key: string]: any;
        }>>;
    };
    placement: {
        type: PropType<"left" | "top" | "right" | "bottom" | undefined>;
        default: undefined;
    };
}>> & {
    onClose?: ((...args: any[]) => any) | undefined;
    "onUpdate:modelValue"?: ((...args: any[]) => any) | undefined;
    onOk?: ((...args: any[]) => any) | undefined;
}, {
    modelValue: boolean;
    placement: "left" | "top" | "right" | "bottom" | undefined;
}, {}>;
export default _default;
