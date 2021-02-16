// file system extras

const fs = require('fs-extra')

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
}
