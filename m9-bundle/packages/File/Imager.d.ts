import { PropType } from 'vue';
declare const _default: import("vue").DefineComponent<{
    src: {
        type: PropType<string | undefined>;
        default: string;
    };
    isShow: {
        type: PropType<boolean>;
        default: boolean;
    };
    width: {
        type: PropType<number | undefined>;
        default: number;
    };
    height: {
        type: PropType<number | undefined>;
        default: number;
    };
}, {
    ActCode: {
        esc: number;
        left: number;
        right: number;
        zoomin: number;
        zoomout: number;
        rotatein: number;
        rotateout: number;
        screen: number;
    };
    state: {
        ratio: number;
        width: number;
        height: number;
        angle: number;
    };
    mypreviewer: import("vue").Ref<any>;
    onHandleAction: (evt: Event) => void;
    onDragImage: (ImageEl: HTMLImageElement) => void;
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("showCallback" | "playOtherImageCallback")[], "showCallback" | "playOtherImageCallback", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    src: {
        type: PropType<string | undefined>;
        default: string;
    };
    isShow: {
        type: PropType<boolean>;
        default: boolean;
    };
    width: {
        type: PropType<number | undefined>;
        default: number;
    };
    height: {
        type: PropType<number | undefined>;
        default: number;
    };
}>> & {
    onShowCallback?: ((...args: any[]) => any) | undefined;
    onPlayOtherImageCallback?: ((...args: any[]) => any) | undefined;
}, {
    width: number | undefined;
    height: number | undefined;
    isShow: boolean;
    src: string | undefined;
}, {}>;
export default _default;
