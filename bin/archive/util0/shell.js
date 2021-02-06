// command line utilities

const shell = require('shelljs')

const execAsync = (command, options={}) => {
  if (!('silent' in options)) options.silent = true
  if (!('cwd' in options)) options.cwd = process.cwd()
  return new Promise((resolve, reject) => {
    shell.exec(command, { ...options }, (code, stdout, stderr) => {
      if (!code) {
        resolve({ code, stdout, stderr })
      } else {
        reject({ code, stdout, stderr })
      }
    })
  })
}

module.exports = {
  ...shell,
  execAsync,
}
