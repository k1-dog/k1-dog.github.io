declare const _default: import("vue").DefineComponent<{
    dragKey: (StringConstructor | NumberConstructor)[];
    isAutoCalculate: {
        type: BooleanConstructor;
        default: boolean;
    };
    isLeft: {
        type: BooleanConstructor;
        default: boolean;
    };
    isRight: {
        type: BooleanConstructor;
        default: boolean;
    };
    isTop: {
        type: BooleanConstructor;
        default: boolean;
    };
    isBottom: {
        type: BooleanConstructor;
        default: boolean;
    };
}, {
    childRef: import("vue").Ref<any>;
    onNotifyUpdateState: () => void;
    leftDragRef: import("vue").Ref<any>;
    leftDraggerStyle: import("vue").ComputedRef<{
        top: string;
        left: string;
    }>;
    rightDragRef: import("vue").Ref<any>;
    rightDraggerStyle: import("vue").ComputedRef<{
        top: string;
        left: string;
    }>;
    topDragRef: import("vue").Ref<any>;
    topDraggerStyle: import("vue").ComputedRef<{
        top: string;
        left: string;
    }>;
    bottomDragRef: import("vue").Ref<any>;
    bottomDraggerStyle: import("vue").ComputedRef<{
        top: string;
        left: string;
    }>;
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, "dragend"[], "dragend", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    dragKey: (StringConstructor | NumberConstructor)[];
    isAutoCalculate: {
        type: BooleanConstructor;
        default: boolean;
    };
    isLeft: {
        type: BooleanConstructor;
        default: boolean;
    };
    isRight: {
        type: BooleanConstructor;
        default: boolean;
    };
    isTop: {
        type: BooleanConstructor;
        default: boolean;
    };
    isBottom: {
        type: BooleanConstructor;
        default: boolean;
    };
}>> & {
    onDragend?: ((...args: any[]) => any) | undefined;
}, {
    isLeft: boolean;
    isRight: boolean;
    isTop: boolean;
    isBottom: boolean;
    isAutoCalculate: boolean;
}, {}>;
export default _default;
