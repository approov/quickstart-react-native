// command line utilities

const fsx = require('./fsx')
const path = require('path')
const compareVersions = require('compare-versions')
const shell = require('./shell')

const isPackage = dir => {
  return (fsx.isDirectory(dir) && fsx.isFile(path.join(dir, 'package.json')))
}

const getInstalledPackageInfo = pkgName => {
  return {
    version: '0.0.0',
  }
}

const isPackageVersionAtLeast = (version, minVersion) => {
  return compareVersions.compare(version, minVersion, '>=')
}

const isReactNativePackage = dir => {
  return isPackage(dir)
}

const isApproovPackageInstalled = dir => {
  const approovPkg = path.join(dir || '.', 'node_modules/@approov/react-native-approov')
  return fsx.isDirectory(approovPkg)
}

const isApproovAccessible = () => !!shell.which('approov')

const getApproovManagementToken = () => {
  return process.env.APPROOV_MANAGEMENT_TOKEN
}

module.exports = {
  isPackage,
  getInstalledPackageInfo,
  isPackageVersionAtLeast,
  isReactNativePackage,
  isApproovPackageInstalled,
  isApproovAccessible,
  getApproovManagementToken,
  }
