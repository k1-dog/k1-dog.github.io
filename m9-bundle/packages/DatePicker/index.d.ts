import { Dayjs } from 'dayjs';
export declare const MikuDatePreCls = "miku-date";
export type DateNow = Dayjs;
export type DateOutputT = Dayjs; /** @see DateConstructor */
export type DateInputT = number;
/** @see 递归生成__日期数据矩阵&&~TS递归定义固定长度数组类型 */
export type DateMatrixT<U, N extends number, R extends Array<U> = []> = R['length'] extends N ? R : DateMatrixT<U, N, [U, ...R]>;
export interface DateBaseProps {
    MY: DateInputT;
    MM: DateInputT;
    MD: DateInputT;
}
declare const MikuDatePicker: import("vue").DefineComponent<{
    modelValue: {
        type: import("vue").PropType<string>;
    };
    mode: {
        type: import("vue").PropType<import("./DatePicker").DateModeT>;
        default: string;
    };
}, {
    state: {
        M5howDatePicker: boolean;
        dateMode: import("./DatePicker").DateModeT;
        currentDate: {
            clone: () => Dayjs;
            isValid: () => boolean;
            year: {
                (): number;
                (value: number): Dayjs;
            };
            month: {
                (): number;
                (value: number): Dayjs;
            };
            date: {
                (): number;
                (value: number): Dayjs;
            };
            day: {
                (): number;
                (value: number): Dayjs;
            };
            hour: {
                (): number;
                (value: number): Dayjs;
            };
            minute: {
                (): number;
                (value: number): Dayjs;
            };
            second: {
                (): number;
                (value: number): Dayjs;
            };
            millisecond: {
                (): number;
                (value: number): Dayjs;
            };
            set: (unit: import("dayjs").UnitType, value: number) => Dayjs;
            get: (unit: import("dayjs").UnitType) => number;
            add: (value: number, unit?: import("dayjs").ManipulateType | undefined) => Dayjs;
            subtract: (value: number, unit?: import("dayjs").ManipulateType | undefined) => Dayjs;
            startOf: (unit: import("dayjs").OpUnitType) => Dayjs;
            endOf: (unit: import("dayjs").OpUnitType) => Dayjs;
            format: (template?: string | undefined) => string;
            diff: (date?: string | number | Date | Dayjs | null | undefined, unit?: "D" | "M" | "y" | "s" | "millisecond" | "second" | "minute" | "hour" | "day" | "month" | "year" | "date" | "milliseconds" | "seconds" | "minutes" | "hours" | "days" | "months" | "years" | "dates" | "d" | "h" | "m" | "ms" | "week" | "weeks" | "w" | "quarter" | "quarters" | "Q" | undefined, float?: boolean | undefined) => number;
            valueOf: () => number;
            unix: () => number;
            daysInMonth: () => number;
            toDate: () => Date;
            toJSON: () => string;
            toISOString: () => string;
            toString: () => string;
            utcOffset: () => number;
            isBefore: (date?: string | number | Date | Dayjs | null | undefined, unit?: import("dayjs").OpUnitType | undefined) => boolean;
            isSame: (date?: string | number | Date | Dayjs | null | undefined, unit?: import("dayjs").OpUnitType | undefined) => boolean;
            isAfter: (date?: string | number | Date | Dayjs | null | undefined, unit?: import("dayjs").OpUnitType | undefined) => boolean;
            locale: {
                (): string;
                (preset: string | ILocale, object?: Partial<ILocale> | undefined): Dayjs;
            };
        };
        now: {
            MY: DateInputT;
            MM: DateInputT;
            MD: DateInputT;
        };
    };
    onSwitch5HowDatePicker: (visable: boolean) => void;
    onUpdateDate: (updateNow: DateBaseProps) => void;
    prepareCompos: (onUpdateDate: (updateNow: DateBaseProps) => void, mode: import("./DatePicker").DateModeT, Y_M_D: DateBaseProps) => [import("vue").VNode<any, import("vue").RendererElement, {
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
        type: import("vue").PropType<import("./DatePicker").DateModeT>;
        default: string;
    };
}>> & {
    "onUpdate:modelValue"?: ((...args: any[]) => any) | undefined;
    onDatePick?: ((...args: any[]) => any) | undefined;
}, {
    mode: import("./DatePicker").DateModeT;
}, {}>;
export default MikuDatePicker;
