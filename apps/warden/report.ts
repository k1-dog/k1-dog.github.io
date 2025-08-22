import { isReportSameID, SentinelToReportAPI } from "./conf"
import { IWardenGuilty } from "./type"
import { kala } from "@k1/http"

function Sentinel () {
    this.prisonPool = []
}
Sentinel.reportEnv = function () {
    const ua = navigator.userAgent
    const now = new Date()
    const timeStr = now.toLocaleTimeString()
    const time = now.getTime()
    const url = window.location.href
    return { ua, time, url }
}
Sentinel.prototype.begin = function (suspect: IWardenGuilty) {
    this.clean(suspect)
}
Sentinel.prototype.clean = function (suspect: IWardenGuilty) {
    // 唯一id判断
    if (!isReportSameID(suspect, this.prisonPool)) return
    this.report(suspect)
}
Sentinel.prototype.report = function (guilty: IWardenGuilty) {

    const globalEnv = Sentinel.reportEnv()
    const wardenInfo = {
        warden: guilty,
        ...globalEnv
    }
    kala.post(SentinelToReportAPI, { ...wardenInfo }).then(() => {
        const { id } = guilty
        this.prisonPool.push(id)
    }).catch(($err) => console.log('==^_^~~~', $err))
}

const sentinel = new Sentinel()

export default sentinel