// command line utilities

const constants = require('./constants0.js')
const chalk = require('chalk')
const ora = require('ora')

const help = (id) => {
  if (id in constants.refs) {
    return chalk.blue(constants.refs[id])
  } else {
    return chalk.blue(constants.refs['contactSupport'])
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
    if (id in constants.refs) {
      return this.info(`See ${chalk.blue(constants.refs[id])} for help.`)
    } else {
      return this.info(`See ${chalk.blue(constants.refs['contactSupport'])} for help.`)
    }
  }

  exit(msg, code=1) {
    this.fail(msg)
    process.exit(code)
  }
}

module.exports = {
  help,
  Log,
}
