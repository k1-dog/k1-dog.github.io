type AnyObject = Record<string, any>;
export declare function _noop(): void;
/**
 * Returns true if `value` is an object (excluding null), else returns false.
 * @param $v - The value to test.
 * @since 2.7.0
 */
export declare function isObject($v: unknown): $v is AnyObject;
export declare const H_isFunction: (value: unknown) => value is (...args: any[]) => any;
/**
 * Returns `value` if defined, else returns `defaultValue`.
 * @param value - The value to return if defined.
 * @param defaultValue - The value to return if `value` is undefined.
 */
export declare function valueOrDefault<T>(value: T | undefined, defaultValue: T): T;
export declare const numberOrZero: (v: unknown | number) => number;
/**
 * @description String.trim() 增强版
 * @function H_Trim
 * @param $str @param $char
 * @return cleanStr
 */
export declare function H_Trim($str: string, $char?: string): string;
/**
 * @description M9-UUID 生成器
 * @function H_M9UUID
 * @return { UUID_STR_T } @param UUID
 */
type UUID_STR_T = string;
export declare function H_M9UUID(): ($M9_UID_TYPE?: 'I' | 'A') => UUID_STR_T;
export declare function _TypeOf(value: unknown): string;
export declare function H_M9CloneDeep($data: any): any;
/**
 *
 * @param {函数上下文} $this
 * @param {待绑定函数} $methodNames
 * @param {待绑定参数} $arguments
 */
export declare function H_StrongMethodsInThisClass($this: any, $methodNames?: Array<any>, ...$arguments: any[]): void;
/**
 * @description [!important. 类似饼图中, 几个饼状图形的绘制, 要求连续性、同步性极强, 怀疑要自行设计出一种画笔绘制时异步变同步的机制, 才能解决这种连续式同步绘图的图形流畅度问题]
 * @class H_M9Whisper
 */
type ComeTrueFnT = ($currentComeTrueResult: any, $comeTrue: ($currentComeTrueResult: any) => any) => any;
interface M9ComeI {
    _no: number | string;
    _value: any;
    _task: ($lastComeTrueResult: any) => any;
    _isDone: boolean;
    _next: M9ComeI | null;
}
export declare class H_M9Whisper {
    _taskSeq: number;
    _firstCome: M9ComeI;
    _comeValue: any;
    _headPointer: M9ComeI | null;
    _tailPointer: M9ComeI | null;
    constructor($firstComeValue?: any);
    $whisper($task: ComeTrueFnT): this;
    $do(): this;
    $comeTrue($yourResult: any, $currentCome: M9ComeI): void;
}
export {};
