import { FT, UploaderProps, UPSTATUS } from './Type';
declare const _default: import("vue").DefineComponent<{}, {
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
            status: UPSTATUS;
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
    onPreview: (file: FT) => void;
    onClosePreview: () => void;
    onFileChange: (evt: MReturnParam<UploaderProps['onChange']>) => void;
    onRemove: (file: FT) => void;
    U$TakeAnotherImageToPlay: (isPrevious?: boolean) => undefined;
}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{}>>, {}, {}>;
export default _default;
