// command line utilities

const logSymbols = require('log-symbols')

const indent = (str, num = 4) => {
  if (!str || 'string' !== typeof str) {
    str = ''
  }
  if (!num || 'number' !== typeof num || num < 0) {
    num = 0
  }

  const sp = ' '.repeat(num)  
  return str.replace(/^(?!$)/mg, sp)
}

const log = msg => console.log(' ', msg)

const logInfo = msg => console.log(logSymbols.info, msg)

const logSuccess = msg => console.log(logSymbols.success, msg)

const logWarning = msg => console.log(logSymbols.warning, msg)

const logError = msg => console.log(logSymbols.error, msg)

const exitError = msg => {
  if (msg) console.log(logSymbols.error, msg)
  process.exit(1)
}

module.exports = {
  indent,
  log,
  logInfo,
  logSuccess,
  logWarning,
  logError,
  exitError,
}
