import { catchGlobalErrorJs, catchGlobalErrorPms } from './catch'
import { isBeOneInWarden } from './conf'
import sentinel from './report'

function globalJsRsHunter($sEvent: ErrorEvent) {
    const catchedGuilty = catchGlobalErrorJs($sEvent)
    if (isBeOneInWarden(catchedGuilty)) {
        sentinel.begin(catchedGuilty)
    }
}
function globalPmsHunter($pmsEvent: PromiseRejectionEvent) {
    const catchedGuilty = catchGlobalErrorPms($pmsEvent)
    if (isBeOneInWarden(catchedGuilty)) {
        sentinel.begin(catchedGuilty)
    }

    $pmsEvent.preventDefault()
}

function seekJs() {
    // 同步异常
    // 分析错误->上报
    window.addEventListener('error', globalJsRsHunter)

    const freeup = () => window.removeEventListener('error', globalJsRsHunter)
    return freeup
}
function seekPms() {
    // 异步(Promise)异常
    // 分析错误->上报
    window.addEventListener('unhandledrejection', globalPmsHunter)

    const freeup = () => window.removeEventListener('unhandledrejection', globalPmsHunter)
    return freeup
}

function start() {
    const freeJsHunter = seekJs()
    const freePmsHunter = seekPms()

    return () => {
        freeJsHunter()
        freePmsHunter()
    }
}

export default start