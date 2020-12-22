// command line utilities

const fs = require('fs-extra')
const path = require('path')
const compareVersions = require('compare-versions')
const chalk = require('chalk')
const logSymbols = require('log-symbols')
const shell = require('shelljs')

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

const execAsync = (command, options={silent: true, cwd: process.cwd()}) => {
  return new Promise((done, failed) => {
    shell.exec(command, { ...options }, (err, stdout, stderr) => {
      if (err) {
        err.stdout = stdout
        err.stderr = stderr
        failed(err)
        return
      }

      done({ stdout, stderr })
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
