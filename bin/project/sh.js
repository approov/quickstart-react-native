// extra shell utilities

const shelljs = require('shelljs')

module.exports = {
  ...shelljs,

  execAsync: (command, options={}) => {
    // if (!('silent' in options)) options.silent = true
    if (!('cwd' in options)) options.cwd = process.cwd()
    return new Promise((resolve, reject) => {
      shelljs.exec(command, { ...options }, (code, stdout, stderr) => {
        if (!code) {
          resolve({ code, stdout, stderr })
        } else {
          reject({ code, stdout, stderr })
        }
      })
    })
  },
}
