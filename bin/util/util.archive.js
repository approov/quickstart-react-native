// command line utilities

const fs = require('fs-extra')
const path = require('path')
const compareVersions = require('compare-versions')
const chalk = require('chalk')
const logSymbols = require('log-symbols')
const shell = require('shelljs')

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

const isPackage = dir => {
  return (isDirectory(dir) && isFile(path.join(dir, 'package.json')))
}

const getInstalledPackageInfo = pkgName => {
  return {
    version: '0.0.0',
  }
}

const isPackageVersionAtLeast = (version, minVersion) => {
  return compareVersions.compare(version, minVersion, '>=')
}

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

const which = cmd => {
  return shell.which(cmd)
}

const isApproovAccessible = () => !!which('approov')

const getApproovManagementToken = () => {
  return process.env.APPROOV_MANAGEMENT_TOKEN
}

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
  isAccessible,
  isReadable,
  isWritable,
  isFile,
  isDirectory,
  isPackage,
  getInstalledPackageInfo,
  isPackageVersionAtLeast,
  execAsync,
  which,
  isApproovAccessible,
  getApproovManagementToken,
  logInfo,
  logSuccess,
  logWarning,
  logError,
  exitError,
}
