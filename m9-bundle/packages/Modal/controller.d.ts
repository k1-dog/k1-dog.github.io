import { VNode } from "vue";
export interface M9ModalProps {
    show: boolean;
    title: string | VNode;
}
export interface M9ModalState {
    isShow: boolean;
    zoomValue: boolean;
}
export interface M9DrawerProps {
    placement: 'top' | 'bottom' | 'left' | 'right' | undefined;
}
export declare const preCls = "miku-modal";
declare function M9ModalController(this: any): import("vue").DefineComponent<{
    show: boolean;
    title: string | VNode<import("vue").RendererNode, import("vue").RendererElement, {
        [key: string]: any;
    }>;
}, () => VNode<import("vue").RendererNode, import("vue").RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{
    show: boolean;
    title: string | VNode<import("vue").RendererNode, import("vue").RendererElement, {
        [key: string]: any;
    }>;
}>, {}, {}>;
export default M9ModalController;
