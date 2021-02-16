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