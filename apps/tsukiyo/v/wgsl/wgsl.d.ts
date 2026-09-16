// wgsl.d.ts — Vite `?raw` 导入的 TypeScript 模块声明（tsc shim）
declare module '*.wgsl?raw' {
  const src: string
  export default src
}
