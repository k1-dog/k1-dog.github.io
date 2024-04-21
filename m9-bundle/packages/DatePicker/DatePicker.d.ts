import dayjs from 'dayjs';
import { _DateHeadType as DHType } from './DatePickHeader';
import { _DateBodyType as DBType } from './DatePickBodier';
import { _DateFootType as DFType } from './DatePickFooter';
import { DateBaseProps } from './index';
import { PropType, VNode } from 'vue';
export type DateModeT = 'Year' | 'Month' | 'Day';
type DateCompoInstance<Z> = VNode<Z>;
type MIKU_DATE_COMPOS = [DateCompoInstance<DHType>, DateCompoInstance<DBType>, DateCompoInstance<DFType>];
declare const _default: import("vue").DefineComponent<{
    modelValue: {
        type: PropType<string>;
    };
    mode: {
        type: PropType<DateModeT>;
        default: string;
    };
}, {
    state: {
        M5howDatePicker: boolean;
        dateMode: DateModeT;
        currentDate: {
            clone: () => dayjs.Dayjs;
            isValid: () => boolean;
            year: {
                (): number;
                (value: number): dayjs.Dayjs;
            };
            month: {
                (): number;
                (value: number): dayjs.Dayjs;
            };
            date: {
                (): number;
                (value: number): dayjs.Dayjs;
            };
            day: {
                (): number;
                (value: number): dayjs.Dayjs;
            };
            hour: {
                (): number;
                (value: number): dayjs.Dayjs;
            };
            minute: {
                (): number;
                (value: number): dayjs.Dayjs;
            };
            second: {
                (): number;
                (value: number): dayjs.Dayjs;
            };
            millisecond: {
                (): number;
                (value: number): dayjs.Dayjs;
            };
            set: (unit: dayjs.UnitType, value: number) => dayjs.Dayjs;
            get: (unit: dayjs.UnitType) => number;
            add: (value: number, unit?: dayjs.ManipulateType | undefined) => dayjs.Dayjs;
            subtract: (value: number, unit?: dayjs.ManipulateType | undefined) => dayjs.Dayjs;
            startOf: (unit: dayjs.OpUnitType) => dayjs.Dayjs;
            endOf: (unit: dayjs.OpUnitType) => dayjs.Dayjs;
            format: (template?: string | undefined) => string;
            diff: (date?: string | number | Date | dayjs.Dayjs | null | undefined, unit?: "D" | "M" | "y" | "s" | "millisecond" | "second" | "minute" | "hour" | "day" | "month" | "year" | "date" | "milliseconds" | "seconds" | "minutes" | "hours" | "days" | "months" | "years" | "dates" | "d" | "h" | "m" | "ms" | "week" | "weeks" | "w" | "quarter" | "quarters" | "Q" | undefined, float?: boolean | undefined) => number;
            valueOf: () => number;
            unix: () => number;
            daysInMonth: () => number;
            toDate: () => Date;
            toJSON: () => string;
            toISOString: () => string;
            toString: () => string;
            utcOffset: () => number;
            isBefore: (date?: string | number | Date | dayjs.Dayjs | null | undefined, unit?: dayjs.OpUnitType | undefined) => boolean;
            isSame: (date?: string | number | Date | dayjs.Dayjs | null | undefined, unit?: dayjs.OpUnitType | undefined) => boolean;
            isAfter: (date?: string | number | Date | dayjs.Dayjs | null | undefined, unit?: dayjs.OpUnitType | undefined) => boolean;
            locale: {
                (): string;
                (preset: string | ILocale, object?: Partial<ILocale> | undefined): dayjs.Dayjs;
            };
        };
        now: {
            MY: number;
            MM: number;
            MD: number;
        };
    };
    onSwitch5HowDatePicker: (visable: boolean) => void;
    onUpdateDate: (updateNow: DateBaseProps) => void;
    prepareCompos: (onUpdateDate: (updateNow: DateBaseProps) => void, mode: DateModeT, Y_M_D: DateBaseProps) => MIKU_DATE_COMPOS;
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("update:modelValue" | "datePick")[], "update:modelValue" | "datePick", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    modelValue: {
        type: PropType<string>;
    };
    mode: {
        type: PropType<DateModeT>;
        default: string;
    };
}>> & {
    "onUpdate:modelValue"?: ((...args: any[]) => any) | undefined;
    onDatePick?: ((...args: any[]) => any) | undefined;
}, {
    mode: DateModeT;
}, {}>;
export default _default;
