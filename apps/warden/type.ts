export interface IWarden {
    catchJs: ($jsEvent: ErrorEvent) => void
    catchAsync: ($pmsEvent: PromiseRejectionEvent) => void
}

export interface IWardenJS {
    stack?: string // 调用栈
    lineno?: number // 行号
    colno?: number // 列号
    fileName?: string // 代码文件路径
}
export interface IWardenRs {
    srcUrl: string // 资源地址
}
export interface IWardenHttp {
    req: any // API - 请求体
    res: any // API - 响应体
    method: 'GET' | 'POST' // API - 请求方式
    httpUrl: string // API - 请求路径
    httpCode: string // API - 响应状态
    httpStartTime: string // API - 请求开始时间
    httpEndTime: string // API - 请求结束时间
}
export interface IWardenGuilty {
    type: 'W-js' | 'W-resource' | 'W-http' | 'W-promise' | 'W-W' // 守望者抓捕类型
    id: string // 基类 - 上报的id
    ip?: string // 基类 - 上报的ip
    url: string // 基类 - 上报的页面路径
    msg: string // 基类 - 上报的消息概要
    time: string // 基类 - 上报的时间
    city?: string // 基类 - 上报的城市地点
    error: Error
}

export interface IWardenJsGuilty extends IWardenGuilty, IWardenJS {}
export interface IWardenRsGuilty extends IWardenGuilty, IWardenRs {}
export interface IWardenHttpGuilty extends IWardenGuilty, IWardenHttp {}

class Sentinel {
    prisonPool: IWardenGuilty['id'][]
}
export interface IWardenSentinel {
    new(): Sentinel
}