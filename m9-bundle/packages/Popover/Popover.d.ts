import { Ref, VNode } from 'vue';
export interface MPopoverProps {
    /**
     * @description 气泡框 悬浮位置 [字符类型] <默认为上侧>
     */
    position?: string; /** @see <|top<|-|>down<|-|>left<|-|>right<| */
    /**
     * @description 气泡框 悬浮开启模式 [字符类型] <默认为点击开启-点击关闭>
     */
    popMode?: string; /** @see <|MP0PClick<|-|>MP0PHover<| */
    /**
     *  @description 气泡框 指定 - <元素的父节点> [默认 document 文档]
     */
    parentNodeSetter?: (elementNode?: Node | null) => Element;
    /**
     * @description 气泡框 外部容器控制开关 [布尔类型] <必选>
     */
    showPop: boolean; /** @see <|true-|==|-false|> */
    /**
     * @description 气泡框 内部容器内容 [React元素] <必选>
     */
    content: VNode;
    /**
     * @description 气泡消失时执行的回调
     */
    onUnP0P?: () => void;
}
declare const _default: import("vue").DefineComponent<{
    showPop: {
        type: BooleanConstructor;
        default: boolean;
    };
    position: {
        type: StringConstructor;
        default: string;
    };
    popMode: {
        type: StringConstructor;
        default: string;
    };
    onUnP0P: {
        type: FunctionConstructor;
        default: () => undefined;
    };
    parentNodeSetter: {
        type: FunctionConstructor;
        default: (elementNode?: Node | null) => Document;
    };
}, {
    state: {
        M5howP0P: boolean;
        P0P5tyle: {
            left: number;
            top: number;
        };
    };
    PopRef: Ref<any>;
    R7arReference: Ref<any>;
    isValidArea: (e: Event) => any;
    setMP0P$Pos: () => void;
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    showPop: {
        type: BooleanConstructor;
        default: boolean;
    };
    position: {
        type: StringConstructor;
        default: string;
    };
    popMode: {
        type: StringConstructor;
        default: string;
    };
    onUnP0P: {
        type: FunctionConstructor;
        default: () => undefined;
    };
    parentNodeSetter: {
        type: FunctionConstructor;
        default: (elementNode?: Node | null) => Document;
    };
}>>, {
    position: string;
    showPop: boolean;
    popMode: string;
    onUnP0P: Function;
    parentNodeSetter: Function;
}, {}>;
export default _default;
