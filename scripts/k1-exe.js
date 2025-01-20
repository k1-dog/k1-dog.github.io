// import { spawn } from 'child_process'
const fs = require('fs')
const { spawn } = require('child_process')
// import { H_M9Whisper } from '../docs/packages/M9-Charts/helper.core'
const { H_M9Whisper } = require('./helper.core.js')

// K1 - 组件库 - 综合打包命令
// 组件库源码打包 + ts类型提示说明文件的生成 = 最终将两者产物揉和到一起 输出最终的工程产物包

const whisper = new H_M9Whisper()
whisper
  .$all(
    [
      (_cv, $ct) => {
        const k1_ui_task = spawn(process.platform === 'win32' ? 'yarn.cmd' : 'yarn', ['build:m9'], { stdio: 'inherit' })
        // 当进程关闭时(子任务执行完成后) 执行的回调函数, 如果执行码 code = 0 -> 执行成功 | 执行异常
        k1_ui_task.on('close', (exitCode) => {
          $ct(exitCode)
        })
      },
      (_cv, $ct) => {
        const k1_ts_task = spawn(process.platform === 'win32' ? 'yarn.cmd' : 'yarn', ['types:m9'], { stdio: 'inherit' })
        k1_ts_task.on('close', (exitCode) => {
          $ct(exitCode)
        })
      }
    ]
  )
  .$whisper((result, $ct) => {
    const [isK1UIBuilt, isK1TSBuilt] = result

    if (isK1UIBuilt === 0 && isK1TSBuilt === 0) {
      // 当两个打包编译任务都执行完成后 - 调用 nodejs 文件目录复制操作, 合并两个包产物到一个最终包
      // 复制目录
      fs.cp('./m9-dts/docs', './dist', { recursive: true }, (err) => {
        if (!err) {
          console.error('✨~ K1 组件库产物包构建完成 √')
          $ct(true)
        } else {
          console.error('⚠️~ K1 组件库产物包构建失败！')
          $ct(false)
        }
      })
    }
  })
  .$whisper((isBuiltDone, $ct) => {
    if (isBuiltDone) {
      fs.rm('./m9-dts', { recursive: true }, (err) => {
        if (err) {
          console.error('⚠️~ K1 组件库 TS 类型声明文件清除失败！')
          $ct(true)
        } else {
          console.error('✨~ K1 组件库 TS 类型声明文件清除成功 √')
          $ct(true)
        }
      })
    } else {
      $ct(false)
    }
  })
  .$do()