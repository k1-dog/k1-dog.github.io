import dayjs from 'dayjs';
import { DateModeT } from './DatePicker';
import { DateBaseProps, DateInputT, DateOutputT, DateMatrixT } from './index';
import { PropType } from 'vue';
interface MikuDateBodyState {
    selectDate: DateOutputT;
}
type dayCellUnit = {
    v: DateInputT;
    k: DateOutputT;
    disabled: boolean;
};
type MonthDataArray = DateMatrixT<DateMatrixT<dayCellUnit, 4>, 3>;
type DayDataArray = DateMatrixT<DateMatrixT<dayCellUnit, 7>, 6>;
type datePanelT<Z> = Z extends 'Month' ? MonthDataArray : DayDataArray;
/**
 * @see ~!important::生成日期组件_主体区域_数据源
 * @returns { datePanelT<Z> } @description 返回--二维日期矩阵
 */
declare function genDateBody<Z extends DateModeT>(mode: Z, now: DateBaseProps): datePanelT<Z>;
declare enum EMOJI {
    left = "\uD83D\uDC07",
    right = "\uD83E\uDD84",
    MonHead1 = "\u2744\uFE0F",
    MonHead2 = "\uD83E\uDD6E",
    MonHead3 = "\uD83C\uDFEE",
    MonHead4 = "\uD83E\uDDE8"
}
type MonthPanelHead = [EMOJI.MonHead1, EMOJI.MonHead2, EMOJI.MonHead3, EMOJI.MonHead4];
type DayPanelHead = ['凌寒⑦', '折纸①', '阿姨②', '狂三③', '小四④', '琴里⑤', '六儿⑥'];
type dateHeadT<H extends DateModeT> = H extends 'Month' ? MonthPanelHead : DayPanelHead;
/**
 * @see ~!important::生成日期组件_头部区域
 * @returns { datePanelT<Z> } @description 返回--一维维日期头部
 */
declare function genDateHead<H extends DateModeT>(mode: H): dateHeadT<H>;
export type _DateBodyType = any;
declare const _default: import("vue").DefineComponent<{
    MY: {
        type: PropType<number>;
    };
    MM: {
        type: PropType<number>;
    };
    MD: {
        type: PropType<number>;
    };
    mode: {
        type: PropType<DateModeT>;
        default: string;
    };
}, {
    state: {
        selectDate: {
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
    };
    getPanelHead: typeof genDateHead;
    getPanelData: typeof genDateBody;
    onSelectDate: (date: MikuDateBodyState['selectDate']) => void;
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, "notifyUpdate"[], "notifyUpdate", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    MY: {
        type: PropType<number>;
    };
    MM: {
        type: PropType<number>;
    };
    MD: {
        type: PropType<number>;
    };
    mode: {
        type: PropType<DateModeT>;
        default: string;
    };
}>> & {
    onNotifyUpdate?: ((...args: any[]) => any) | undefined;
}, {
    mode: DateModeT;
}, {}>;
export default _default;
