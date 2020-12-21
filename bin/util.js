// command line utilities

const fs = require('fs-extra')
const path = require('path')
const compareVersions = require('compare-versions')
const chalk = require('chalk')

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

const getApproovManagementToken = () => {
  return process.env.APPROOV_MANAGEMENT_TOKEN
}

const exitError = msg => {
  console.log(chalk.red(`Error: ${msg}`))
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
  getApproovManagementToken,
  exitError,
}
