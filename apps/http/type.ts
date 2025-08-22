export interface IHttpKalaConfig {
    httpCtrler: AbortController
    timeout: number
}
export interface IHttpKalaResError extends Error {
    response?: Response
}