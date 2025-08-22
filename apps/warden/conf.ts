import { _TypeOf } from "../utils/core.cjs"
import { IWardenGuilty } from "./type"

const GUILTY_ID = Symbol('M9_Warden_Flag')

function isReportSameID($suspect: IWardenGuilty, $prisonPool: IWardenGuilty['id'][]) {
    const { id, msg } = $suspect
    const even = ($idInPrison: IWardenGuilty['id']) => id === $idInPrison
    if ($prisonPool.some(even)) {
        console.log('the guilty has been with justice in warden', `need not report ${msg}`)
        return true
    }
    return false
}
function hasOwnWardenFlag($suspect) {
  return Object.prototype.hasOwnProperty.call($suspect, GUILTY_ID) &&
         Object.prototype.propertyIsEnumerable.call($suspect, GUILTY_ID)
}
// 在守望者中 - 归一化
function toBeOneID($suspect: IWardenGuilty) {
    const { msg, url } = $suspect
    const gWardenId = `${msg}_${url}`
    return window.btoa(decodeURIComponent(encodeURIComponent(gWardenId)))
}
function toBeOneError($rawError) {
    const oneError = $rawError instanceof Error ? $rawError : new Error(String($rawError))
    if (!oneError.stack && Error.captureStackTrace) {
        Error.captureStackTrace(oneError, toBeOneError)
    }
    return oneError
}
function toBeOneStack($stack) {
    if (!$stack) return
    const lines = $stack.split('\n').slice(1)
    return lines.map($line => {
        const match = $line.match(/at\s+(.*?)\s+$(.*?):(\d+):(\d+)$/)
        return match ? {
            function: match[1],
            file: match[2],
            line: match[3],
            column: match[4]
        } : null
    }).filter(Boolean)
}
const toBeOneInWarden = ($suspect) => {
    if (_TypeOf($suspect) !== 'object') {
        return
    }
    const { error: rawError } = $suspect
    $suspect.error = toBeOneError(rawError)
    $suspect.stack = toBeOneStack($suspect.error.stack)
    $suspect.msg = $suspect.error.message || rawError.message
    $suspect[GUILTY_ID] = toBeOneID($suspect)

    return $suspect
}
const isBeOneInWarden = ($suspect) => {
    if (_TypeOf($suspect) === 'object') {
        return hasOwnWardenFlag($suspect)
    }
    return false
}

const SentinelToReportAPI = '/k1/warden/to_report'

export {
    GUILTY_ID,
    isReportSameID,
    toBeOneInWarden,
    isBeOneInWarden,
    SentinelToReportAPI
}