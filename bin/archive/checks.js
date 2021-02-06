
const { Command } = require('commander')
const cli = require('./cli')
const path = require('path')
const fsx = require('./fsx')
const {fix} = require('./info')
const chalk = require('chalk')
const tmp = require('tmp-promise')
const compareVersions = require('compare-versions')
const lineByline = require('n-readlines')
const xml2js = require('xml2js')

const REACT_NATIVE_MIN_VERSION = '0.60'
const REACT_NATIVE_ANDROID_MIN_SDK = '21'
const REACT_NATIVE_IOS_MIN_VERSION = '10.0'

const initState = () => ({errors: 0, warnings: 0 })

const updateState = (state, status) => {
  if (status && Number.isFinite(status.errors)) {
    state.errors += status.errors
    delete state.errors
  }
  if (status && Number.isFinite(status.warnings)) {
    state.warnings += status.warnings
    delete state.warnings
  }
  return { ...status, ...state }
}

module.exports = {

  initState: () => initState(),

  canRunApproovCLI: async () => {
    const spinner = cli.spinner().start(`Checking for Approov CLI...`)
    if (!!fsx.which('approov')) {
      spinner.succeed('Found the Approov CLI.')
    } else {
      spinner.fail('The Approov CLI is not installed or not in the current PATH.')
      cli.logNote(`  See ${fix.approovCLI} for help.`)
      return updateState({errors:1})
    }

    // check if runnable
    spinner.start(`Checking if Approov CLI is runnable...`)
    try {
      const { stdout, stderr } = await fsx.execAsync('approov whoami')
      spinner.succeed(`Confirmed the Approov CLI is runnable.`)
    } catch (err) {
      spinner.fail('The Approov CLI is not runnable.')
      cli.logNote(`  See ${fix.approovCLI} for help.`)
      return updateState({errors:1})
    }
    
    return updateState({approovInstalled:true})
  },

  hasApproovProtectedAPIs: async () => {
    const extractDomains = (str) => {
      if (!str) return []  
      const lines = str.split(/\r?\n/)
      // grab only indented non-empty lines
      return lines.filter(str => /^\s+\S/.test(str)).map(str => str.trim())
    }

    // check api domains
    const spinner = cli.spinner().start(`Checking for Approov-protected API domains...`)
    let apiDomains =[]
    try {
      const { stdout } = await fsx.execAsync('approov api -list')
      apiDomains = extractDomains(stdout)
      spinner.succeed(`Approov is protecting these API domains:`)
      apiDomains.forEach(domain => cli.logNote(chalk.green(`  ${domain}`)))
      cli.logInfo(`To add or remove API domains, see ${fix.approovAPIDomains}.`)
    } catch (err) {
      spinner.fail('Failed to find Approov-protected API domains.')
      cli.logNote(`  See ${fix.approovAPIDomains} for help.`)
    }
  },

  isReactNativeProject: async (dir) => {
    const getProject = dir => {
      if (!fsx.isDirectory(dir) && !fsx.isFile(path.join(dir, 'package.json'))) {
        return undefined
      }
      let filePath = path.join(dir, 'package.json')
      if (!filePath.includes(path.sep)) filePath= `.${path.sep}${filePath}`
      return require(filePath)
    }

    const spinner = cli.spinner().start(`Checking for React Native Project...`)
    const project = getProject(dir)
    if (!project) {
      spinner.fail('Current directory does not appear to be an npm project.')
      cli.logNote(`  See ${fix.reactnativeProject} for help.`)
      return updateState({errors:1})
    }

    if (!project.dependencies || !project.dependencies['react-native']) {
      spinner.fail('Current directory does not appear to be a React Native project.')
      cli.logNote(`  See ${fix.reactnativeProject} for help.`)
      return updateState({errors:1})
    }
    spinner.succeed(`Found a React Native project.`)

    spinner.start(`Checking React Native minimum version...`)
    let warnings = 0
    const version = project.dependencies['react-native']
    if (!compareVersions.compare(version, REACT_NATIVE_MIN_VERSION, '>=')) {
      spinner.warn(`Approov recommends a React Native version >= ${REACT_NATIVE_MIN_VERSION}); found version (${version}.`)
      cli.logNote(`  See ${fix.reactnativeProject} for help.`)
      ++warnings
    } else {
      spinner.succeed(`Found React Native version ${version}.`)
    }

    spinner.start(`Checking if \'@approov/react-native-approov\` package is installed...`)
    if (!project.dependencies || !project.dependencies['react-native-approov']) {
      spinner.fail('Current directory does not appear to be a React Native project.')
      cli.logNote(`  See ${fix.reactnativeProject} for help.`)
      return updateState({errors:1})
    }
    spinner.succeed(`Found a React Native project.`)


    return updateState({isReactNativeProject:true, warnings:1})
  },

  hasAndroidTarget: (dir) => {
    const spinner = cli.spinner().start(`Checking for Android target...`)
    const buildFile = path.join(dir, 'android', 'build.gradle')
    if (!fsx.isFile(buildFile)) {
      spinner.warn('Project does not contain a recognizable Android target.')
      cli.logNote(`  See ${fix.androidTarget} for help.`)
      return updateState({warnings:1})
    } else {
      spinner.succeed(`Found Android target.`)
    }

    spinner.start(`Checking for Android minimum SDK...`)
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
      spinner.fail(`Approov recommends a minimum Android SDK of ${REACT_NATIVE_ANDROID_MIN_SDK}; unable to find a minimum SDK in the target.`)
      cli.logNote(`  See ${fix.androidTarget} for help.`)
      return updateState({hasAndroidTarget:true, errors:1})
    } else if (!compareVersions.compare(sdk, REACT_NATIVE_ANDROID_MIN_SDK, '>=')) {
      spinner.fail(`Approov requires a minimum Android SDK of ${REACT_NATIVE_ANDROID_MIN_SDK}; found minimum SDK ${sdk}.`)
      cli.logNote(`  See ${fix.androidTarget} for help.`)
      return updateState({hasAndroidTarget:true, errors:1})
    } else {
      spinner.succeed(`Found minimum Android SDK (${sdk}.`)
      return updateState({hasAndroidTarget:true} )
    }
  },

  hasAndroidNetworkPermissions: async (dir) => {
    const spinner = cli.spinner().start(`Checking for Android network permissions...`)
    const manifestFile = path.join(dir, 'android', 'app', 'src', 'main', 'AndroidManifest.xml')
    if (!fsx.isFile(manifestFile)) {
      spinner.fail('Unable to find Android manifest.')
      cli.logNote(`  See ${fix.androidNetworkPermissions} for help.`)
      return updateState({errors:1})
    }

    const parser = new xml2js.Parser()
    try {
      const data = await fsx.readFile(manifestFile)
      try {
        const result = await parser.parseStringPromise(data)
        const permissions = result.manifest['uses-permission'].map(value => {
          return value['$'] && value['$']['android:name']
        }) || {}
        let errs = 0
        if (!permissions.includes('android.permission.INTERNET')) {
          ++errs
          spinner.fail('Missing required \'android.permission.INTERNET\' in Android manifest.')
          cli.logNote(`  See ${fix.androidNetworkPermissions} for help.`)
        } else {
          spinner.succeed('Found \'android.permission.INTERNET\' in Android manifest.')
        }
        spinner.start(`Checking for Android network permissions...`)
        if (!permissions.includes('android.permission.INTERNET')) {
          ++errs
          spinner.fail('Missing required \'android.permission.ACCESS_NETWORK_STATE\' in Android manifest.')
          cli.logNote(`  See ${fix.androidNetworkPermissions} for help.`)
        } else {
          spinner.succeed('Found \'android.permission.ACCESS_NETWORK_STATE\' in Android manifest.')
        }
        return updateState({errors:errs})
      } catch (err) {
        spinner.fail('Unable to parse Android manifest.')
        cli.logNote(`  See ${fix.androidNetworkPermissions} for help.`)
        return updateState({errors:1})
      }
    } catch (err) {
      spinner.fail('Unable to read Android manifest.')
      cli.logNote(`  See ${fix.androidNetworkPermissions} for help.`)
      return updateState({errors:1})
    }
  },

  checkIosProject: async (dir) => {
    const spinner = cli.spinner(`Verifying React Native iOS Project...`).start()

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
