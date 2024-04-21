interface MRootHangState {
    _container_: Element | undefined;
    MOUNT_FLAG: boolean;
}
declare function selfContainer(): HTMLDivElement;
declare const _default: import("vue").DefineComponent<{
    isOpen: {
        type: BooleanConstructor;
        default: boolean;
    };
    isActive: {
        type: BooleanConstructor;
        default: boolean;
    };
    getContainer: {
        type: FunctionConstructor;
        default: typeof selfContainer;
    };
}, {
    state: MRootHangState;
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    isOpen: {
        type: BooleanConstructor;
        default: boolean;
    };
    isActive: {
        type: BooleanConstructor;
        default: boolean;
    };
    getContainer: {
        type: FunctionConstructor;
        default: typeof selfContainer;
    };
}>>, {
    isOpen: boolean;
    isActive: boolean;
    getContainer: Function;
}, {}>;
export default _default;
