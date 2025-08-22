import { toBeOneInWarden } from "./conf"
import { IWardenGuilty, IWardenJsGuilty, IWardenRsGuilty } from "./type"

// 抓捕全局资源类异常错误 (静态图片、文档、js加载失败)
// IWarden['catchJs']
export function catchGlobalErrorJs($jsEv: ErrorEvent) {
    const { type, target, message, lineno, colno, error, filename, source } = $jsEv
    if (type !== 'error') return

    if (!target || (target && !target?.localName)) {
        let _wardenJs: IWardenJsGuilty = {} as IWardenJsGuilty
        //  JS运行错误
        _wardenJs.type = 'W-js'
        _wardenJs.fileName = filename
        _wardenJs.lineno = lineno
        _wardenJs.colno = colno
        _wardenJs.error = error || new Error(message)
        return toBeOneInWarden(_wardenJs)
    } else {
        let _wardenRs: IWardenRsGuilty = {} as IWardenRsGuilty
        // 资源加载错误
        _wardenRs.type = 'W-resource'
        const { tagName, nodeName, localName, currentSrc, src } = target || {}
        const errorSource = (tagName || nodeName || localName || '').toLowerCase()
        if (!currentSrc || !errorSource) return

        if (errorSource === 'img' || errorSource === 'script') {
            const errorMsg = `Failed to load ${errorSource} ${src}`
            _wardenRs.srcUrl = src
            _wardenRs.error = new Error(errorMsg)
            return toBeOneInWarden(_wardenRs)
        }
    }
}

// 抓捕全局异步类异常错误 (Promise) / 定时器、网络请求API - 另行集成
export function catchGlobalErrorPms($asyncEv: PromiseRejectionEvent) {
    const { reason: error,  type } = $asyncEv
    let _wardenPms: IWardenGuilty = {
        type: 'W-promise',
        error
    } as IWardenGuilty

    return toBeOneInWarden(_wardenPms)
}