import { CSSProperties, PropType } from 'vue';
export declare const M9WebAdaptor: import("vue").DefineComponent<{}, void, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{}>>, {}, {}>;
export declare const MGCol: import("vue").DefineComponent<{
    span: {
        type: PropType<string | number>;
        default: number;
    };
    offset: {
        type: PropType<string | number | undefined>;
        default: number;
    };
    MGutter: {
        type: PropType<string | number | undefined>;
        default: number;
    };
    align: {
        type: PropType<"left" | "right" | undefined>;
        default: string;
    };
}, {
    GColConstruction: () => (string | {
        padding: string;
    })[];
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    span: {
        type: PropType<string | number>;
        default: number;
    };
    offset: {
        type: PropType<string | number | undefined>;
        default: number;
    };
    MGutter: {
        type: PropType<string | number | undefined>;
        default: number;
    };
    align: {
        type: PropType<"left" | "right" | undefined>;
        default: string;
    };
}>>, {
    span: string | number;
    offset: string | number | undefined;
    MGutter: string | number | undefined;
    align: "left" | "right" | undefined;
}, {}>;
export declare const M9Col: import("vue").DefineComponent<{
    span: {
        type: PropType<string | number>;
        default: number;
    };
    offset: {
        type: PropType<string | number | undefined>;
        default: number;
    };
    MGutter: {
        type: PropType<string | number | undefined>;
        default: number;
    };
    align: {
        type: PropType<"left" | "right" | undefined>;
        default: string;
    };
}, {
    GColConstruction: () => (string | {
        padding: string;
    })[];
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    span: {
        type: PropType<string | number>;
        default: number;
    };
    offset: {
        type: PropType<string | number | undefined>;
        default: number;
    };
    MGutter: {
        type: PropType<string | number | undefined>;
        default: number;
    };
    align: {
        type: PropType<"left" | "right" | undefined>;
        default: string;
    };
}>>, {
    span: string | number;
    offset: string | number | undefined;
    MGutter: string | number | undefined;
    align: "left" | "right" | undefined;
}, {}>;
export declare const M9Row: import("vue").DefineComponent<{
    MGGutter: {
        type: PropType<number | number[]>;
        default: number;
    };
    type: {
        type: PropType<"" | "flex" | undefined>;
        default: string;
    };
    justify: {
        type: PropType<"start" | "end" | "center" | "space-between" | "space-around" | undefined>;
        default: string;
    };
    align: {
        type: PropType<"start" | "end" | "center" | undefined>;
        default: string;
    };
}, {
    GRowConstruction: () => (string | CSSProperties)[];
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    MGGutter: {
        type: PropType<number | number[]>;
        default: number;
    };
    type: {
        type: PropType<"" | "flex" | undefined>;
        default: string;
    };
    justify: {
        type: PropType<"start" | "end" | "center" | "space-between" | "space-around" | undefined>;
        default: string;
    };
    align: {
        type: PropType<"start" | "end" | "center" | undefined>;
        default: string;
    };
}>>, {
    type: "" | "flex" | undefined;
    align: "start" | "end" | "center" | undefined;
    MGGutter: number | number[];
    justify: "start" | "end" | "center" | "space-between" | "space-around" | undefined;
}, {}>;
