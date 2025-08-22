import { IHttpKalaConfig, IHttpKalaResError } from "./type"

class Http {
    static Conf = {
        method: 'GET',
        timeout: 10 * 1000,
        headers: {
            'Content-Type': 'application/json'
        }
    }

    constructor() {}

    toBeOne($config) {
        // 归一 - GET请求的Url查询参数
        let _url = $config.url
        if ($config.params && Object.keys($config.params).length) {
            const urlPrms = new URLSearchParams($config.params)
            _url += (_url.includes('?') ? '&' : '?') + urlPrms.toString()
        }

        const httpCtrler = new AbortController()

        const options: RequestInit = {
            method: $config.method || Http.Conf.method,
            headers: {
                ...Http.Conf.headers,
                ...($config.headers ?? {})
            },
            signal: httpCtrler.signal
        }
        if (options.method === 'POST' && $config.data) {
            const payload = $config.data
            try {
                options.body = JSON.stringify(payload)
            } catch (error) {
                options.body = undefined
            }
        }

        return { url: _url, options, extraConf: { httpCtrler, timeout: $config.timeout || Http.Conf.timeout } }
    }

    checkCtrlTimeout($config: IHttpKalaConfig, $httpGoing) {
        const { timeout, httpCtrler } = $config
        let _httpOvertimeID: null | NodeJS.Timeout = setTimeout(() => {
            httpCtrler.abort(`Request timeout after ${timeout}ms`)
            httpCtrler
            _httpOvertimeID && clearTimeout(_httpOvertimeID)
            _httpOvertimeID = null
        }, timeout)

        $httpGoing.finally($res => {
            _httpOvertimeID && clearTimeout(_httpOvertimeID)
            _httpOvertimeID = null
            return $res
        })
    }

    go($kalaArgs) {
        const { url, options, extraConf } = $kalaArgs
        const goingHttp = fetch(url, options)
            .then(async ($respond) => {
                if (!$respond.ok) {
                    const error: IHttpKalaResError = new Error($respond.statusText)
                    error.response = $respond
                    throw error
                }
                return $respond.json()
            })
            .catch(($error) => { throw new Error(`Request failed: ${$error.message}`) })

        this.checkCtrlTimeout(extraConf, goingHttp)

        return goingHttp
    }

    get($url, $params, $config = {}) {
        const kalaArgs = this.toBeOne({ ...$config, url: $url, params: $params, method: 'GET' })
        return this.go(kalaArgs)
    }

    post($url, $data, $config = {}) {
        const kalaArgs = this.toBeOne({ ...$config, url: $url, data: $data, method: 'POST' })
        return this.go(kalaArgs)
    }
}

const kala = new Http()

export { kala }