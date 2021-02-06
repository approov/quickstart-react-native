// command line utilities

const fs = require('fs-extra')
const shell = require('shelljs')

module.exports = {

  ...fs,

  isAccessible: (file, mode = fs.constants.F_OK) => {
    try {
      fs.accessSync(file, mode)
    } catch {
      return false
    }
    return true
  },

  isReadable: (file) => {
    try {
      fs.accessSync(file, fs.constants.R_OK)
    } catch {
      return false
    }
    return true
  },

  isWritable: (file) => {
    try {
      fs.accessSync(file, fs.constants.W_OK)
    } catch {
      return false
    }
    return true
  },

  isFile: (file, mode = fs.constants.F_OK) => {
    try {
      fs.accessSync(file, mode)
      const stats = fs.statSync(file)
      return stats ? stats.isFile() : false
    } catch {
      return false
    }
  },

  isDirectory: (dir, mode = fs.constants.F_OK) => {
    try {
      fs.accessSync(dir, mode)
      const stats = fs.statSync(dir)
      return stats ? stats.isDirectory() : false
    } catch {
      return false
    }
  },

  ...shell,

  execAsync: (command, options={}) => {
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
  },

}
