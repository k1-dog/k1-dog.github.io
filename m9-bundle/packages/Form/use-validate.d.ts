/**
 * @author Izayoi - Miku _ 诱宵美九助场
 * @author Origami - 鸢一折纸 大师 主场
 * @description 美九自设计 - 折纸ZZ表单验证器 [网上找的都是啥玩意儿啊 ~ 试了半天真难用, 还不如自己敲着简洁]
 */
import { ComputedRef, Ref } from "vue";
declare enum RULER {
    'required' = "required",
    'strLen' = "strLen",
    'numRan' = "numRan",
    'url' = "url",
    'date' = "date",
    'email' = "email"
}
type onRulerE = () => boolean;
interface ZZVResultorT {
    $model: any;
    $ruleType?: keyof typeof RULER;
    $message?: string;
    $invalid?: ComputedRef<boolean> | boolean;
    $onRuler?: onRulerE;
}
type ZZStateResultorsT<YR> = {
    [R in keyof YR]?: Ref<ZZVResultorT>;
};
export type ZZV0<ZVKeys0> = {
    $__walk__: () => boolean;
    $touch: (stateName: keyof ZVKeys0) => boolean;
    $reset: (stateName: keyof ZVKeys0) => void;
    $clear: (stateName: keyof ZVKeys0) => void;
    $setStateValue: (stateName: keyof ZVKeys0, stateValue: unknown) => void;
} & ZZStateResultorsT<ZVKeys0>;
type ZZFormStateT<ZVKeys1> = {
    [ZSK1 in keyof ZVKeys1]?: {
        initValue: any;
        isRequired: boolean;
    };
};
type ZZFormRulesT<ZVKeys2> = {
    [ZRK2 in keyof ZVKeys2]?: keyof typeof RULER;
};
interface ZZValidatorPropsT<ZVKeysY1> {
    $state: ZZFormStateT<ZVKeysY1>;
    $rules?: ZZFormRulesT<ZVKeysY1>;
    $Resultors: ZZStateResultorsT<ZVKeysY1>;
}
type ZValidatorT = (<ZVKeys3>(state: ZZValidatorPropsT<ZVKeys3>['$state'], rules: ZZValidatorPropsT<ZVKeys3>['$rules']) => ZZV0<ZVKeys3> | null) & Record<`ZV$_${RULER}`, (value: any) => boolean>;
declare const ZValidator: ZValidatorT;
export default ZValidator;
