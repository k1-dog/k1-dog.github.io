interface Unique {
    <U>(arr: Array<U>): U[];
}
export declare const unique: Unique;
interface isNumber {
    (x: any): boolean;
}
export declare const isM9Number: isNumber;
interface MikuFileReader {
    (_OF_: Blob): FileReader;
}
export declare const createFileReader: MikuFileReader;
export declare const toDrawIMG: (IMG: HTMLImageElement, _W_: number, _H_: number) => string;
export declare const ResizeIMG: (OResult: string | ArrayBuffer | null, expectSize?: number) => Promise<unknown>;
type convertIMGBase64Return = {
    uri: string;
    width: number;
    height: number;
};
interface MikuBase64 {
    (_f_: Blob, _es_?: number): Promise<convertIMGBase64Return>;
}
export declare const _getBase64OfMiku_: MikuBase64;
export {};
