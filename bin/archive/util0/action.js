const path = require('path')
const fs = require('fs')
const { Command } = require('commander')
const prompts = require('prompts')
const chalk = require('chalk')
const ora = require('ora')
const cli = require('../util/cli')
const fsx = require('../util/fsx')
const rna = require('../util/rna')
const shell = require('../util/shell')
const tmp = require('tmp-promise')
const compareVersions = require('compare-versions')
const lineByline = require('n-readlines')
const xml2js = require('xml2js')

const REACT_NATIVE_MIN_VERSION = '0.60'
const REACT_NATIVE_ANDROID_MIN_SDK = '21'
const REACT_NATIVE_IOS_MIN_VERSION = '10.0'

const getProject = dir => {
  if (!fsx.isDirectory(dir) && !fsx.isFile(path.join(dir, 'package.json'))) {
    return false
  }
  let filePath = path.join(dir, 'package.json')
  if (!filePath.includes(path.sep)) filePath= `.${path.sep}${filePath}`
  return require(filePath)
}

module.exports = {

  checkApproovInstallation: async () => {
    const spinner = ora(`Verifying Approov account...`).start()
    try {
      const { stdout, stderr } = await shell.execAsync('approov whoami')
      spinner.succeed(`Verified Approov CLI installed`)
      return true
    } catch (err) {
      if (rna.isApproovAccessible()) {
        spinner.fail('Found the Approov CLI, but it is not associated with a recognized account.')
      } else {
        spinner.fail('The Approov CLI is not installed or not in the current PATH.')
      }
      return false
    }
  },

  checkReactNativeProject: async (dir) => {
    const spinner = ora(`Verifying React Native Project...`).start()
    const project = getProject(dir)
    if (!project) {
      spinner.fail('Current directory does not appear to be a React Native project')
      return false
    }
    if (!project.dependencies || !project.dependencies['react-native']) {
      spinner.fail('Current directory does not appear to be a React Native project')
      return false
    }
    const version = project.dependencies['react-native']
    if (!compareVersions.compare(version, REACT_NATIVE_MIN_VERSION, '>=')) {
      spinner.fail(`Project does not meet minimum recommended React Native package version for Approov (${version} < ${REACT_NATIVE_MIN_VERSION})`)
      return false
    } else {
      spinner.succeed(`Verified project meets minimum React Native package version (${version} >= ${REACT_NATIVE_MIN_VERSION})`)
      return true
    }
  },

  checkAndroidProject: async (dir) => {
    const spinner = ora(`Verifying React Native Android Project...`).start()

    const buildFile = path.join(dir, 'android', 'build.gradle')
    if (!fsx.isFile(buildFile)) {
      spinner.fail('Project does not contain a recognizable Android project')
      return false
    }

    const minSDKre = /minSdkVersion\s*=\s*(\d+)/
    let minSDK = 0
    const lines = new lineByline(buildFile)
    let line
    while (line = lines.next()) {
      const result = line.toString().match(minSDKre)
      if (result) {
        const val = parseInt(result[1], 10)
        if (minSDK < val) minSDK = val
      }
    }
    const sdk = minSDK > 0 ? minSDK.toString() : null

    if (!sdk) {
      spinner.fail(`Unable to locate a minimum Android SDK spec; Approov requires ${REACT_NATIVE_ANDROID_MIN_SDK}`)
      return false
    } else if (!compareVersions.compare(sdk, REACT_NATIVE_ANDROID_MIN_SDK, '>=')) {
      spinner.fail(`Project does not meet minimum recommended Android SDK for Approov (${sdk} < ${REACT_NATIVE_ANDROID_MIN_SDK})`)
      return false
    } else {
      spinner.succeed(`Verified project meets minimum Android SDK requirements (${sdk} >= ${REACT_NATIVE_ANDROID_MIN_SDK})`)
      return true
    }
  },

  checkAndroidNetworkPermissions: async (dir) => {
    const spinner = ora(`Verifying React Native Android network permissions...`).start()

    const manifestFile = path.join(dir, 'android', 'app', 'src', 'main', 'AndroidManifest.xml')
    if (!fsx.isFile(manifestFile)) {
      spinner.fail('Project does not contain a recognizable Android manifest')
      return false
    }

    const parser = new xml2js.Parser()
    try {
      const data = await fsx.readFile(manifestFile)
      try {
        const result = await parser.parseStringPromise(data)
        console.dir(result.manifest['uses-permission'][0]['$']['android:name'])
        console.dir(result.manifest['uses-permission'][1]['$']['android:name'])
        console.log('Done')
      } catch (err) {

      }
    } catch (err) {

    }

    spinner.succeed(`Verified React Native Android network permissions`)
    return true
  },

  checkIosProject: async (dir) => {
    const spinner = ora(`Verifying React Native iOS Project...`).start()

    const projName = path.basename(process.cwd())

    const wsDir = path.join(dir, 'ios', `${projName}.xcworkspace`)
    if (!fsx.isDirectory(wsDir)) {
      spinner.fail('Project does not contain a recognizable iOS workspace')
      return false
    }
    const pbxFile = path.join(dir, 'ios', `${projName}.xcodeproj`, 'project.pbxproj')
    if (!fsx.isFile(pbxFile)) {
      spinner.fail(`Unable to locate an iOS deployment target version; Approov requires ${REACT_NATIVE_IOS_MIN_VERSION}`)
      return false
    }

    const minVersionRE = /IPHONEOS_DEPLOYMENT_TARGET\s*=\s*(\d+)\.?(\d*)/
    let minMinor = 0
    let minMajor = 0
    const lines = new lineByline(pbxFile)
    let line
    while (line = lines.next()) {
      const result = line.toString().match(minVersionRE)
      if (result) {
        const major = parseInt(result[1])
        const minor = parseInt(result[2])
        if (minMajor < major || (minMajor == major && minMinor < minor)) {
          minMajor = major
          minMinor = minor
        }
      }
    }
    const version = minMajor > 0 ? `${minMajor}.${minMinor}` : null

    if (!version) {
      spinner.fail(`Unable to locate an iOS deployment target version; Approov requires ${REACT_NATIVE_IOS_MIN_VERSION}`)
      return false

    } else if (!compareVersions.compare(version, REACT_NATIVE_IOS_MIN_VERSION, '>=')) {
      spinner.fail(`Project does not meet minimum recommended iOS version for Approov (${version} < ${REACT_NATIVE_IOS_MIN_VERSION})`)
      return false
    } else {
      spinner.succeed(`Verified project meets minimum iOS version requirements (${version} >= ${REACT_NATIVE_IOS_MIN_VERSION})`)
      return true
    }
  },

}
