// command line utilities

const fs = require('fs-extra')

const isAccessible = (file, mode = fs.constants.F_OK) => {
  try {
    fs.accessSync(file, mode)
  } catch {
    return false
  }
  return true
}

const isReadable = (file) => {
  try {
    fs.accessSync(file, fs.constants.R_OK)
  } catch {
    return false
  }
  return true
}

const isWritable = (file) => {
  try {
    fs.accessSync(file, fs.constants.W_OK)
  } catch {
    return false
  }
  return true
}

const isFile = (file, mode = fs.constants.F_OK) => {
  try {
    fs.accessSync(file, mode)
    const stats = fs.statSync(file)
    return stats ? stats.isFile() : false
  } catch {
    return false
  }
}

const isDirectory = (dir, mode = fs.constants.F_OK) => {
  try {
    fs.accessSync(dir, mode)
    const stats = fs.statSync(dir)
    return stats ? stats.isDirectory() : false
  } catch {
    return false
  }
}

module.exports = {
  ...fs,
  isAccessible,
  isReadable,
  isWritable,
  isFile,
  isDirectory,
}
