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

const config = require('./config.js')
const chalk = require('chalk')
const ora = require('ora')

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

  info(msg) {
    this.spinner.info(msg||' ')
  }

  warn(msg) {
    this.spinner.warn(msg||' ')
  }

  fail(msg) {
    this.spinner.fail(msg||' ')
  }

  help(id) {
    if (id in config.refs) {
      return this.info(`See ${chalk.blue(config.refs[id])} for help.`)
    } else {
      return this.info(`See ${chalk.blue(config.refs['contactSupport'])} for help.`)
    }
  }

  ref(id) {
    if (id in config.refs) {
      return chalk.blue(config.refs[id])
    } else {
      return chalk.blue(config.refs['contactSupport'])
    }
  }
  
  exit(msg, code=1) {
    this.fail(msg)
    process.exit(code)
  }
}

module.exports = Log