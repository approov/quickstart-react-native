// command line utilities

const ora = require('ora')
const logSymbols = require('log-symbols')

module.exports = {

  indent: (str, num = 4) => {
    if (!str || 'string' !== typeof str) {
      str = ''
    }
    if (!num || 'number' !== typeof num || num < 0) {
      num = 0
    }

    const sp = ' '.repeat(num)  
    return str.replace(/^(?!$)/mg, sp)
  },

  spinner: (msg) => ora(`Verifying Approov account...`).start(),

  logNote: msg => console.log(' ', msg),

  logInfo: msg => console.log(logSymbols.info, msg),

  logSuccess: msg => console.log(logSymbols.success, msg),

  logWarning: msg => console.log(logSymbols.warning, msg),

  logError: msg => console.log(logSymbols.error, msg),

  exitError: msg => {
    if (msg) console.log(logSymbols.error, msg)
    process.exit(1)
  },

}
