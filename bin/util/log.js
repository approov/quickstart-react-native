/*
 * MIT License
 *
 * Copyright (c) 2016-present, CriticalBlue Ltd.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute,
 * sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all copies or
 * substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
 * NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT
 * OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// command line utilities

const chalk = require('chalk')
const ora = require('ora')

class LogError extends Error {
  constructor(...params) {
    // Pass remaining arguments (including vendor specific ones) to parent constructor
    super(...params)

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, LogError)
    }

    this.name = 'LogError'
    // Custom debugging information
    this.date = new Date()
  }
}

class Log {
  constructor() {
    this.spinner = ora()
  }

  spin(msg) {
    this.spinner.start(msg||' ')
  }

  note(msg) {
    this.spinner.stopAndPersist({symbol:' ', text:msg||' '})
  }

  succeed(msg) {
    this.spinner.succeed(msg||' ')
  }

  help(ref) {
    if (ref) {
      return this.spinner.info(`See ${chalk.blue(ref)} for more info.`)
    } else {
      return this.spinner.info(`Contact support for assistance.`)
    }
  }

  info(msg, help) {
    this.spinner.info(msg||' ')
    if (help) this.help((help))
  }

  warn(msg, help) {
    this.spinner.warn(msg||' ')
    if (help) this.help((help))
  }

  fail(msg, help = null, fatal = false) {
    this.spinner.fail(msg||' ')
    if (help) this.help((help))
  }
 
  fatal(msg, help = null) {
    this.spinner.fail(msg||' ')
    if (help) this.help((help))
    throw new LogError(msg)
  }
  
  exit(msg, code=1) {
    this.fail(msg)
    process.exit(code)
  }
}

module.exports = { Log, LogError }