import { App } from 'vue';
import M9Chart from './M9-Charts/m9._z0_';
export declare const M9K1: typeof M9Chart;
export declare const M9MsgX: {
    (props: import("./Message/Type").M9MsgProps): void;
    success(customProps: any): void;
    warning(customProps: any): void;
    error(customProps: any): void;
    info(customProps: any): void;
};
export declare const M9InstallX: (app: App) => void;
declare const _default: {
    M9Button: import("vue").DefineComponent<{
        type: {
            type: import("vue").PropType<import("./Button/Button").btnTypes | undefined>;
            default: string;
        };
        shape: {
            type: import("vue").PropType<import("./Button/Button").shapeTypes | undefined>;
            default: string;
        };
        size: {
            type: import("vue").PropType<import("./Button/Button").sizeTypes | undefined>;
            default: string;
        };
        disabled: {
            type: import("vue").PropType<boolean | undefined>;
            default: boolean;
        };
        loading: {
            type: import("vue").PropType<boolean | undefined>;
            default: boolean;
        };
    }, {
        buttonEle: null;
        onHandleClick: Function;
    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
        type: {
            type: import("vue").PropType<import("./Button/Button").btnTypes | undefined>;
            default: string;
        };
        shape: {
            type: import("vue").PropType<import("./Button/Button").shapeTypes | undefined>;
            default: string;
        };
        size: {
            type: import("vue").PropType<import("./Button/Button").sizeTypes | undefined>;
            default: string;
        };
        disabled: {
            type: import("vue").PropType<boolean | undefined>;
            default: boolean;
        };
        loading: {
            type: import("vue").PropType<boolean | undefined>;
            default: boolean;
        };
    }>>, {
        size: import("./Button/Button").sizeTypes | undefined;
        type: import("./Button/Button").btnTypes | undefined;
        shape: import("./Button/Button").shapeTypes | undefined;
        disabled: boolean | undefined;
        loading: boolean | undefined;
    }, {}>;
    M9CheckBox: import("vue").DefineComponent<{
        modelValue: {
            type: ArrayConstructor;
            default: () => never[];
        };
        options: {
            type: import("vue").PropType<any[]>;
            default: () => never[];
        };
        replaceFields: {
            type: import("vue").PropType<{
                [key: string]: string;
            }>;
            default: () => {
                key: string;
                value: string;
            };
        };
    }, {
        state: {
            MCItems: {
                key: string | number;
                value: any;
                checked: boolean;
                disabled: boolean;
            }[];
            checkedItems?: any[] | undefined;
            allCheckState: {
                isChecked: 0 | 1 | 2;
                onAllChecked: (isAll: boolean) => void;
            };
        };
        onChecked: (MCIKey: string | number) => void;
    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("change" | "update:modelValue")[], "change" | "update:modelValue", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
        modelValue: {
            type: ArrayConstructor;
            default: () => never[];
        };
        options: {
            type: import("vue").PropType<any[]>;
            default: () => never[];
        };
        replaceFields: {
            type: import("vue").PropType<{
                [key: string]: string;
            }>;
            default: () => {
                key: string;
                value: string;
            };
        };
    }>> & {
        onChange?: ((...args: any[]) => any) | undefined;
        "onUpdate:modelValue"?: ((...args: any[]) => any) | undefined;
    }, {
        replaceFields: {
            [key: string]: string;
        };
        options: any[];
        modelValue: unknown[];
    }, {}>;
    M9CheckboxItem: any;
    M9DatePicker: import("vue").DefineComponent<{
        modelValue: {
            type: import("vue").PropType<string>;
        };
        mode: {
            type: import("vue").PropType<import("./DatePicker/DatePicker").DateModeT>;
            default: string;
        };
    }, {
        state: {
            M5howDatePicker: boolean;
            dateMode: import("./DatePicker/DatePicker").DateModeT;
            currentDate: {
                clone: () => import("dayjs").Dayjs;
                isValid: () => boolean;
                year: {
                    (): number;
                    (value: number): import("dayjs").Dayjs;
                };
                month: {
                    (): number;
                    (value: number): import("dayjs").Dayjs;
                };
                date: {
                    (): number;
                    (value: number): import("dayjs").Dayjs;
                };
                day: {
                    (): number;
                    (value: number): import("dayjs").Dayjs;
                };
                hour: {
                    (): number;
                    (value: number): import("dayjs").Dayjs;
                };
                minute: {
                    (): number;
                    (value: number): import("dayjs").Dayjs;
                };
                second: {
                    (): number;
                    (value: number): import("dayjs").Dayjs;
                };
                millisecond: {
                    (): number;
                    (value: number): import("dayjs").Dayjs;
                };
                set: (unit: import("dayjs").UnitType, value: number) => import("dayjs").Dayjs;
                get: (unit: import("dayjs").UnitType) => number;
                add: (value: number, unit?: import("dayjs").ManipulateType | undefined) => import("dayjs").Dayjs;
                subtract: (value: number, unit?: import("dayjs").ManipulateType | undefined) => import("dayjs").Dayjs;
                startOf: (unit: import("dayjs").OpUnitType) => import("dayjs").Dayjs;
                endOf: (unit: import("dayjs").OpUnitType) => import("dayjs").Dayjs;
                format: (template?: string | undefined) => string;
                diff: (date?: string | number | Date | import("dayjs").Dayjs | null | undefined, unit?: "D" | "M" | "y" | "s" | "millisecond" | "second" | "minute" | "hour" | "day" | "month" | "year" | "date" | "milliseconds" | "seconds" | "minutes" | "hours" | "days" | "months" | "years" | "dates" | "d" | "h" | "m" | "ms" | "week" | "weeks" | "w" | "quarter" | "quarters" | "Q" | undefined, float?: boolean | undefined) => number;
                valueOf: () => number;
                unix: () => number;
                daysInMonth: () => number;
                toDate: () => Date;
                toJSON: () => string;
                toISOString: () => string;
                toString: () => string;
                utcOffset: () => number;
                isBefore: (date?: string | number | Date | import("dayjs").Dayjs | null | undefined, unit?: import("dayjs").OpUnitType | undefined) => boolean;
                isSame: (date?: string | number | Date | import("dayjs").Dayjs | null | undefined, unit?: import("dayjs").OpUnitType | undefined) => boolean;
                isAfter: (date?: string | number | Date | import("dayjs").Dayjs | null | undefined, unit?: import("dayjs").OpUnitType | undefined) => boolean;
                locale: {
                    (): string;
                    (preset: string | ILocale, object?: Partial<ILocale> | undefined): import("dayjs").Dayjs;
                };
            };
            now: {
                MY: number;
                MM: number;
                MD: number;
            };
        };
        onSwitch5HowDatePicker: (visable: boolean) => void;
        onUpdateDate: (updateNow: import("./DatePicker/index").DateBaseProps) => void;
        prepareCompos: (onUpdateDate: (updateNow: import("./DatePicker/index").DateBaseProps) => void, mode: import("./DatePicker/DatePicker").DateModeT, Y_M_D: import("./DatePicker/index").DateBaseProps) => [import("vue").VNode<any, import("vue").RendererElement, {
            [key: string]: any;
        }>, import("vue").VNode<any, import("vue").RendererElement, {
            [key: string]: any;
        }>, import("vue").VNode<any, import("vue").RendererElement, {
            [key: string]: any;
        }>];
    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("update:modelValue" | "datePick")[], "update:modelValue" | "datePick", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
        modelValue: {
            type: import("vue").PropType<string>;
        };
        mode: {
            type: import("vue").PropType<import("./DatePicker/DatePicker").DateModeT>;
            default: string;
        };
    }>> & {
        "onUpdate:modelValue"?: ((...args: any[]) => any) | undefined;
        onDatePick?: ((...args: any[]) => any) | undefined;
    }, {
        mode: import("./DatePicker/DatePicker").DateModeT;
    }, {}>;
    M9Row: import("vue").DefineComponent<{
        MGGutter: {
            type: import("vue").PropType<number | number[]>;
            default: number;
        };
        type: {
            type: import("vue").PropType<"" | "flex" | undefined>;
            default: string;
        };
        justify: {
            type: import("vue").PropType<"start" | "end" | "center" | "space-between" | "space-around" | undefined>;
            default: string;
        };
        align: {
            type: import("vue").PropType<"start" | "end" | "center" | undefined>;
            default: string;
        };
    }, {
        GRowConstruction: () => (string | import("vue").CSSProperties)[];
    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
        MGGutter: {
            type: import("vue").PropType<number | number[]>;
            default: number;
        };
        type: {
            type: import("vue").PropType<"" | "flex" | undefined>;
            default: string;
        };
        justify: {
            type: import("vue").PropType<"start" | "end" | "center" | "space-between" | "space-around" | undefined>;
            default: string;
        };
        align: {
            type: import("vue").PropType<"start" | "end" | "center" | undefined>;
            default: string;
        };
    }>>, {
        type: "" | "flex" | undefined;
        align: "start" | "end" | "center" | undefined;
        MGGutter: number | number[];
        justify: "start" | "end" | "center" | "space-between" | "space-around" | undefined;
    }, {}>;
    M9Col: import("vue").DefineComponent<{
        span: {
            type: import("vue").PropType<string | number>;
            default: number;
        };
        offset: {
            type: import("vue").PropType<string | number | undefined>;
            default: number;
        };
        MGutter: {
            type: import("vue").PropType<string | number | undefined>;
            default: number;
        };
        align: {
            type: import("vue").PropType<"left" | "right" | undefined>;
            default: string;
        };
    }, {
        GColConstruction: () => (string | {
            padding: string;
        })[];
    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
        span: {
            type: import("vue").PropType<string | number>;
            default: number;
        };
        offset: {
            type: import("vue").PropType<string | number | undefined>;
            default: number;
        };
        MGutter: {
            type: import("vue").PropType<string | number | undefined>;
            default: number;
        };
        align: {
            type: import("vue").PropType<"left" | "right" | undefined>;
            default: string;
        };
    }>>, {
        span: string | number;
        offset: string | number | undefined;
        MGutter: string | number | undefined;
        align: "left" | "right" | undefined;
    }, {}>;
    M9Input: import("vue").DefineComponent<{
        modelValue: {
            type: import("vue").PropType<string>;
            default: string;
        };
        size: {
            type: import("vue").PropType<"small" | "medium" | "latge">;
            default: string;
        };
        disabled: {
            type: import("vue").PropType<boolean>;
            default: boolean;
        };
        customIcon: {
            type: import("vue").PropType<string>;
            default: string;
        };
    }, {
        handleBlur: (e: Event) => void;
        handleFocus: (e: Event) => void;
        handleChange: (e: Event) => void;
    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("blur" | "change" | "focus" | "update:modelValue")[], "blur" | "change" | "focus" | "update:modelValue", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
        modelValue: {
            type: import("vue").PropType<string>;
            default: string;
        };
        size: {
            type: import("vue").PropType<"small" | "medium" | "latge">;
            default: string;
        };
        disabled: {
            type: import("vue").PropType<boolean>;
            default: boolean;
        };
        customIcon: {
            type: import("vue").PropType<string>;
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
    M9Modal: import("vue").DefineComponent<{
        modelValue: {
            type: import("vue").PropType<boolean>;
            default: boolean;
        };
        title: {
            type: import("vue").PropType<string | import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
                [key: string]: any;
            }>>;
        };
        placement: {
            type: import("vue").PropType<"left" | "top" | "right" | "bottom" | undefined>;
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
            type: import("vue").PropType<boolean>;
            default: boolean;
        };
        title: {
            type: import("vue").PropType<string | import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
                [key: string]: any;
            }>>;
        };
        placement: {
            type: import("vue").PropType<"left" | "top" | "right" | "bottom" | undefined>;
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
    M9Nav: import("vue").DefineComponent<{
        menus: {
            type: import("vue").PropType<import("./Navigation/Navigation.type").MNavMenuItem[]>;
            required: true;
            default: () => never[];
        };
    }, {}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
        menus: {
            type: import("vue").PropType<import("./Navigation/Navigation.type").MNavMenuItem[]>;
            required: true;
            default: () => never[];
        };
    }>>, {
        menus: import("./Navigation/Navigation.type").MNavMenuItem[];
    }, {}>;
    M9Popover: import("vue").DefineComponent<{
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
            default: (elementNode?: Node | null | undefined) => Document;
        };
    }, {
        state: {
            M5howP0P: boolean;
            P0P5tyle: {
                left: number;
                top: number;
            };
        };
        PopRef: import("vue").Ref<any>;
        R7arReference: import("vue").Ref<any>;
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
            default: (elementNode?: Node | null | undefined) => Document;
        };
    }>>, {
        position: string;
        showPop: boolean;
        popMode: string;
        onUnP0P: Function;
        parentNodeSetter: Function;
    }, {}>;
    M9Select: import("vue").DefineComponent<{
        modelValue: {
            type: (StringConstructor | ArrayConstructor)[];
        };
        options: {
            type: import("vue").PropType<{
                label: string;
                value: any;
            }[]>;
            default: () => never[];
        };
        multiable: {
            type: BooleanConstructor;
            default: boolean;
        };
        filterable: {
            type: BooleanConstructor;
            default: boolean;
        };
        replaceFields: {
            type: import("vue").PropType<{
                value: string;
                label: string;
            }>;
            default: () => {
                value: string;
                label: string;
            };
        };
        onFilter: {
            type: import("vue").PropType<((opt: {
                MSVal: string | number;
                MSLabel: any;
                selected: boolean;
            }, searchV: string) => boolean | void) | undefined>;
            default: () => boolean;
        };
    }, {
        state: any;
        selectRef: import("vue").Ref<HTMLElement | null>;
        optionsPanelRef: import("vue").Ref<HTMLElement | null>;
        optionsPanelViewportRef: import("vue").Ref<HTMLElement | null>;
        isSelectAll: import("vue").ComputedRef<0 | 1 | 2>;
        onSelectAll: () => void;
        onMultiSelect: (e: Event) => void;
        onHandleSelect: (e: Event) => void;
        onFilterOptions: (filteringVal?: String | undefined) => undefined;
        onChangeFilteringV: (filteringVal?: String | undefined) => void;
        onOpenSelectPanel: (cur_visible: boolean) => void;
        renderMultiSelectX: (playValueGroup: {
            MSVal: string | number;
            MSLabel: any;
            selected: boolean;
        }[] | undefined) => Element;
        rowHeight: number;
        playValueGroup: import("vue").ComputedRef<any>;
    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("filter" | "select" | "update:modelValue")[], "filter" | "select" | "update:modelValue", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
        modelValue: {
            type: (StringConstructor | ArrayConstructor)[];
        };
        options: {
            type: import("vue").PropType<{
                label: string;
                value: any;
            }[]>;
            default: () => never[];
        };
        multiable: {
            type: BooleanConstructor;
            default: boolean;
        };
        filterable: {
            type: BooleanConstructor;
            default: boolean;
        };
        replaceFields: {
            type: import("vue").PropType<{
                value: string;
                label: string;
            }>;
            default: () => {
                value: string;
                label: string;
            };
        };
        onFilter: {
            type: import("vue").PropType<((opt: {
                MSVal: string | number;
                MSLabel: any;
                selected: boolean;
            }, searchV: string) => boolean | void) | undefined>;
            default: () => boolean;
        };
    }>> & {
        onSelect?: ((...args: any[]) => any) | undefined;
        "onUpdate:modelValue"?: ((...args: any[]) => any) | undefined;
        onFilter?: ((...args: any[]) => any) | undefined;
    }, {
        replaceFields: {
            value: string;
            label: string;
        };
        options: {
            label: string;
            value: any;
        }[];
        onFilter: ((opt: {
            MSVal: string | number;
            MSLabel: any;
            selected: boolean;
        }, searchV: string) => boolean | void) | undefined;
        multiable: boolean;
        filterable: boolean;
    }, {}>;
    M9Spin: import("vue").DefineComponent<{
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
        SpinRef: import("vue").Ref<any>;
        SpinLoadingRef: import("vue").Ref<any>;
        SpinTextRef: import("vue").Ref<any>;
        SpinInnerRef: import("vue").Ref<any>;
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
    M9Switch: import("vue").DefineComponent<{
        modelValue: {
            type: BooleanConstructor;
        };
        isLoading: {
            type: import("vue").PropType<boolean>;
            default: boolean;
        };
        size: {
            type: import("vue").PropType<"small" | "medium" | "large">;
            default: string;
        };
        disabled: {
            type: import("vue").PropType<boolean>;
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
            type: import("vue").PropType<boolean>;
            default: boolean;
        };
        size: {
            type: import("vue").PropType<"small" | "medium" | "large">;
            default: string;
        };
        disabled: {
            type: import("vue").PropType<boolean>;
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
    M9File: import("vue").DefineComponent<{}, {
        state: {
            imager: {
                name: string;
                width: number;
                height: number;
                _MFID_: string;
                imgUrl: string;
            } | null;
            fileList: {
                name: string;
                width: number;
                height: number;
                active: boolean;
                percentage: number;
                imgUrl: string;
                status: import("./File/Type").UPSTATUS;
                rawFile: {
                    _MFID_: string;
                    readonly lastModified: number;
                    readonly name: string;
                    readonly webkitRelativePath: string;
                    readonly size: number;
                    readonly type: string;
                    arrayBuffer: () => Promise<ArrayBuffer>;
                    slice: (start?: number | undefined, end?: number | undefined, contentType?: string | undefined) => Blob;
                    stream: () => ReadableStream<Uint8Array>;
                    text: () => Promise<string>;
                };
                $xhr: {
                    _kill: (xhr: XMLHttpRequest) => void;
                    xhr: {
                        onreadystatechange: ((this: XMLHttpRequest, ev: Event) => any) | null;
                        readonly readyState: number;
                        readonly response: any;
                        readonly responseText: string;
                        responseType: XMLHttpRequestResponseType;
                        readonly responseURL: string;
                        readonly responseXML: Document | null;
                        readonly status: number;
                        readonly statusText: string;
                        timeout: number;
                        readonly upload: {
                            addEventListener: {
                                <K extends keyof XMLHttpRequestEventTargetEventMap>(type: K, listener: (this: XMLHttpRequestUpload, ev: XMLHttpRequestEventTargetEventMap[K]) => any, options?: boolean | AddEventListenerOptions | undefined): void;
                                (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions | undefined): void;
                            };
                            removeEventListener: {
                                <K_1 extends keyof XMLHttpRequestEventTargetEventMap>(type: K_1, listener: (this: XMLHttpRequestUpload, ev: XMLHttpRequestEventTargetEventMap[K_1]) => any, options?: boolean | EventListenerOptions | undefined): void;
                                (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions | undefined): void;
                            };
                            onabort: ((this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => any) | null;
                            onerror: ((this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => any) | null;
                            onload: ((this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => any) | null;
                            onloadend: ((this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => any) | null;
                            onloadstart: ((this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => any) | null;
                            onprogress: ((this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => any) | null;
                            ontimeout: ((this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => any) | null;
                            dispatchEvent: (event: Event) => boolean;
                        };
                        withCredentials: boolean;
                        abort: () => void;
                        getAllResponseHeaders: () => string;
                        getResponseHeader: (name: string) => string | null;
                        open: {
                            (method: string, url: string | URL): void;
                            (method: string, url: string | URL, async: boolean, username?: string | null | undefined, password?: string | null | undefined): void;
                        };
                        overrideMimeType: (mime: string) => void;
                        send: (body?: Document | XMLHttpRequestBodyInit | null | undefined) => void;
                        setRequestHeader: (name: string, value: string) => void;
                        readonly DONE: number;
                        readonly HEADERS_RECEIVED: number;
                        readonly LOADING: number;
                        readonly OPENED: number;
                        readonly UNSENT: number;
                        addEventListener: {
                            <K_2 extends keyof XMLHttpRequestEventMap>(type: K_2, listener: (this: XMLHttpRequest, ev: XMLHttpRequestEventMap[K_2]) => any, options?: boolean | AddEventListenerOptions | undefined): void;
                            (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions | undefined): void;
                        };
                        removeEventListener: {
                            <K_3 extends keyof XMLHttpRequestEventMap>(type: K_3, listener: (this: XMLHttpRequest, ev: XMLHttpRequestEventMap[K_3]) => any, options?: boolean | EventListenerOptions | undefined): void;
                            (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions | undefined): void;
                        };
                        onabort: ((this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => any) | null;
                        onerror: ((this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => any) | null;
                        onload: ((this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => any) | null;
                        onloadend: ((this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => any) | null;
                        onloadstart: ((this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => any) | null;
                        onprogress: ((this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => any) | null;
                        ontimeout: ((this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => any) | null;
                        dispatchEvent: (event: Event) => boolean;
                    };
                } | null;
                _MFID_: string;
                readonly lastModified: number;
                readonly webkitRelativePath: string;
                readonly size: number;
                readonly type: string;
                arrayBuffer: () => Promise<ArrayBuffer>;
                slice: (start?: number | undefined, end?: number | undefined, contentType?: string | undefined) => Blob;
                stream: () => ReadableStream<Uint8Array>;
                text: () => Promise<string>;
            }[];
            everyImgSize: number;
            showImager: boolean;
        };
        onPreview: (file: import("./File/Type").FT) => void;
        onClosePreview: () => void;
        onFileChange: (evt: import("./File/Type").ChangeEvent<HTMLInputElement>) => void;
        onRemove: (file: import("./File/Type").FT) => void;
        U$TakeAnotherImageToPlay: (isPrevious?: boolean) => undefined;
    }, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{}>>, {}, {}>;
    M9Form: import("vue").DefineComponent<{
        formModel: {
            type: import("vue").PropType<{}>;
            required: true;
            default: () => {};
        };
        formRules: {
            type: import("vue").PropType<{}>;
            required: true;
            default: () => {};
        };
    }, () => any, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
        formModel: {
            type: import("vue").PropType<{}>;
            required: true;
            default: () => {};
        };
        formRules: {
            type: import("vue").PropType<{}>;
            required: true;
            default: () => {};
        };
    }>>, {
        formModel: {};
        formRules: {};
    }, {}>;
    M9Table: import("vue").DefineComponent<{
        MTableColumns: {
            type: import("vue").PropType<import("./Table/Type").MTColumnsT>;
            default: () => never[];
        };
        MikuDataSource: {
            type: import("vue").PropType<any[]>;
            default: () => never[];
        };
        MTRowHeight: {
            type: import("vue").PropType<number>;
            default: number;
        };
        MKey: {
            type: import("vue").PropType<string>;
            default: string;
        };
        MTScroll: {
            type: import("vue").PropType<{
                [key: string]: number;
            } | undefined>;
            default: () => {
                x: number;
                h: number;
            };
        };
    }, {
        state: {
            M9Columns: {
                key: string;
                fixed?: true | "left" | "right" | undefined;
                sortable?: boolean | undefined;
                filterable?: boolean | undefined;
                selectable?: boolean | undefined;
                isTreeNode?: boolean | undefined;
                type?: string | undefined;
                formatter?: ((O: {
                    rowData: any;
                    value: any;
                }) => any) | undefined;
                title?: string | undefined;
                width?: number | undefined;
            }[];
            M9Data: any[];
        };
        tableRef: import("vue").Ref<any>;
        viewportRef: import("vue").Ref<any>;
        onRefreshM9Data: (callNewM9Data: any) => void;
        onRefreshM9Columns: (newM9Columns: any) => void;
    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
        MTableColumns: {
            type: import("vue").PropType<import("./Table/Type").MTColumnsT>;
            default: () => never[];
        };
        MikuDataSource: {
            type: import("vue").PropType<any[]>;
            default: () => never[];
        };
        MTRowHeight: {
            type: import("vue").PropType<number>;
            default: number;
        };
        MKey: {
            type: import("vue").PropType<string>;
            default: string;
        };
        MTScroll: {
            type: import("vue").PropType<{
                [key: string]: number;
            } | undefined>;
            default: () => {
                x: number;
                h: number;
            };
        };
    }>>, {
        MikuDataSource: any[];
        MTableColumns: import("./Table/Type").MTColumnsT;
        MKey: string;
        MTRowHeight: number;
        MTScroll: {
            [key: string]: number;
        } | undefined;
    }, {}>;
};
export default _default;
