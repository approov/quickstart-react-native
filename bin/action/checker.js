
const { Command } = require('commander')
const path = require('path')
const { cli, fsx } = require('../util')
const { info, fix } = require('./approov')
const chalk = require('chalk')
const tmp = require('tmp-promise')
const compareVersions = require('compare-versions')
const lineByline = require('n-readlines')
const xml2js = require('xml2js')
const { notStrictEqual } = require('assert')

class Checker {
  constructor(dir = process.cwd(), version = 'latest') {
    this.versionName = version
    this.dir = dir
    this.errors = 0
    this.warnings = 0

    this.checkedReactNative = false
    this.hasReactNative = false
    this.reactNativeProject = null

    this.checkedApproovCLI = false
    this.hasApproovCLI = false

    this.checkedApproovVersion = false
    this.hasApproovVersion = false
    this.approovVersion = { name: 'unspecified', isSupported: false } 

    this.checkedApproovPackage = false
    this.hasApproovPackage = false

    this.checkedAndroidTarget = false
    this.hasAndroidTarget = false

    this.checkedAndroidApproov = false
    this.hasAndroidApproov = false

    this.checkedIosTarget = false
    this.hasIosTarget = false

    this.checkedIosApproov = false
    this.hasIosApproov = false
  }

  async checkReactNative() {
    if (this.checkedReactNative) return

    const getProject = dir => {
      if (!fsx.isDirectory(dir) && !fsx.isFile(path.join(dir, 'package.json'))) {
        return undefined
      }
      let filePath = path.join(dir, 'package.json')
      if (!filePath.includes(path.sep)) filePath= `.${path.sep}${filePath}`
      return require(filePath)
    }

    const spinner = cli.spinner().start(`Checking for a React Native Project...`)
    const project = getProject(this.dir)
    this.reactNativeProject = project
    if (!this.reactNativeProject) {
      spinner.fail('Directory does not appear to be an npm project.')
      cli.logNote(`  See ${fix.reactnativeProject} for help.`)
      this.errors++
      this.hasReactNative = false
      this.checkedReactNative = true
      return
    }

    if (!project.dependencies || !project.dependencies['react-native']) {
      spinner.fail('Directory does not appear to be a React Native project.')
      cli.logNote(`  See ${fix.reactnativeProject} for help.`)
      this.errors++
      this.hasReactNative = false
      this.checkedReactNative = true
      return
    }
    spinner.succeed(`Found a React Native project.`)
    this.hasReactNative = true
 
    spinner.start(`Checking React Native minimum version...`)
    const version = project.dependencies['react-native']
    if (!compareVersions.compare(version, info.reactNativeMinVersion, '>=')) {
      spinner.warn(`Approov recommends a React Native version >= ${info.reactNativeMinVersion}); found version (${version}.`)
      cli.logNote(`  See ${fix.reactnativeProject} for help.`)
      this.warnings++
    } else {
      spinner.succeed(`Found React Native version ${version}.`)
    }
    this.checkedReactNative = true
  }

  async checkApproovCLI() {
    if (this.checkedApproovCLI) return

    const spinner = cli.spinner().start(`Checking for the Approov CLI...`)

    if (!fsx.which('approov')) {
      spinner.fail('The Approov CLI is not installed or not in the current PATH.')
      cli.logNote(`  See ${fix.approovCLI} for help.`)
      this.errors++
      this.hasApproovCLI = false
      this.checkedApproovCLI = true
      return
    }

    try {
      const { stdout, stderr } = await fsx.execAsync('approov whoami')
      spinner.succeed(`The Approov CLI is accessible.`)
      this.hasApproovCLI = true
    } catch (err) {
      spinner.fail('The Approov CLI is not accessible.')
      cli.logNote(`  See ${fix.approovCLI} for help.`)
      this.errors++
      this.hasApproovCLI = false
    }
    this.checkedApproovCLI = true
  }

  async checkApproovAPIs() {
    if (!this.checkedApproovCLI) await this.checkApproovCLI()

    if (!this.hasApproovCLI) return

    const spinner = cli.spinner().start(`Checking for Approov-protected API domains...`)
    const extractDomains = (str) => {
      if (!str) return []  
      const lines = str.split(/\r?\n/)
      // grab only indented non-empty lines
      return lines.filter(str => /^\s+\S/.test(str)).map(str => str.trim())
    }
    let apiDomains =[]
    try {
      const { stdout } = await fsx.execAsync('approov api -list')
      apiDomains = extractDomains(stdout)
      spinner.succeed(`Approov is currently protecting these API domains:`)
      apiDomains.forEach(domain => cli.logNote(chalk.green(`  ${domain}`)))
      cli.logInfo(`To add or remove API domains, see ${fix.approovAPIDomains}.`)
    } catch (err) {
      spinner.fail('Failed to find Approov-protected API domains.')
      cli.logNote(`  See ${fix.approovAPIDomains} for help.`)
      ++this.errors
    }
  }

  async checkApproovVersion() {
    if (this.checkedApproovVersion) return

    const spinner = cli.spinner().start(`Checking Approov version...`)
    const version = info.byVersion(this.versionName)
    if (version.isSupported) {
      spinner.succeed(`Using Approov version \'${version.name}\'.`)
      this.hasApproovVersion = true
    } else {
      spinner.fail(`Approov version \'${version.name}\' not supported.`)
      cli.logNote(`  See ${fix.ApproovVersion} for help.`)
      this.errors++
      this.hasApproovVersion = false
    }
    this.approovVersion = version
    this.checkedApproovVersion = true
  }

  async checkApproovPackage() {
    if (this.checkedApproovPackage) return

    if (!this.checkedReactNative) await this.checkReactNative()
    if (!this.hasReactNative) return

    const spinner = cli.spinner().start(`Checking if \'@approov/react-native-approov\` package is installed...`)
    const project = this.reactNativeProject
    if (!project.dependencies || !project.dependencies['react-native-approov']) {
      spinner.info('The \'@approov/react-native-approov\` package is not installed')
      this.hasReactNativeApproov = false
    } else {
      spinner.info('The \'@approov/react-native-approov\` package is installed')
      this.hasApproovPackage = true
    }
    this.checkedApproovPackage = true
  }

  async checkAndroidTarget(sync = false) {
    if (this.checkedAndroidTarget) return

    if (!this.checkedReactNative) await this.checkReactNative()
    if (!this.hasReactNative) return
    if (!this.checkedApproovVersion) await this.checkApproovVersion()
    if (!this.hasApproovVersion) return

    const spinner = cli.spinner().start(`Checking for Android target...`)
    const buildFile = path.join(this.dir, 'android', 'build.gradle')
    if (!fsx.isFile(buildFile)) {
      spinner.warn('Project does not contain a recognizable Android target.')
      cli.logNote(`  See ${fix.androidTarget} for help.`)
      this.warnings++
      this.hasAndroidTarget = false
      this.checkedAndroidTarget = true
      return
    }
    spinner.succeed(`Found Android target.`)
    this.hasAndroidTarget = true
    this.checkedAndroidTarget = true

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
      spinner.fail(`Approov requires a minimum Android SDK of \'${this.approovVersion.androidMinSDK}\'; unable to find a minimum SDK in the target.`)
      cli.logNote(`  See ${fix.androidTarget} for help.`)
      this.errors++
    } else if (!compareVersions.compare(sdk, this.approovVersion.androidMinSDK, '>=')) {
      spinner.fail(`Approov requires a minimum Android SDK of \'${this.approovVersion.androidMinSDK}\'; found only \'${sdk}\'.`)
      cli.logNote(`  See ${fix.androidTarget} for help.`)
      this.errors++
    } else {
      spinner.succeed(`Found minimum Android SDK \'${sdk}\'.`)
    }

    spinner.start(`Checking for Android network permissions...`)
    const manifestFile = path.join(this.dir, 'android', 'app', 'src', 'main', 'AndroidManifest.xml')
    if (!fsx.isFile(manifestFile)) {
      spinner.fail('Unable to find Android manifest.')
      cli.logNote(`  See ${fix.androidNetworkPermissions} for help.`)
      this.errors++
      return
    }

    const parser = new xml2js.Parser()
    try {
      const data = await fsx.readFile(manifestFile)
      try {
        const result = await parser.parseStringPromise(data)
        const permissions = result.manifest['uses-permission'].map(value => {
          return value['$'] && value['$']['android:name']
        }) || {}
        if (!permissions.includes('android.permission.INTERNET')) {
          spinner.fail('Missing required \'android.permission.INTERNET\' in Android manifest.')
          cli.logNote(`  See ${fix.androidNetworkPermissions} for help.`)
          this.errors++
        } else {
          spinner.succeed('Found \'android.permission.INTERNET\' in Android manifest.')
        }
        spinner.start(`Checking for Android network permissions...`)
        if (!permissions.includes('android.permission.INTERNET')) {
          spinner.fail('Missing required \'android.permission.ACCESS_NETWORK_STATE\' in Android manifest.')
          cli.logNote(`  See ${fix.androidNetworkPermissions} for help.`)
          this.errors++
        } else {
          spinner.succeed('Found \'android.permission.ACCESS_NETWORK_STATE\' in Android manifest.')
        }
      } catch (err) {
        spinner.fail('Unable to parse Android manifest.')
        cli.logNote(`  See ${fix.androidNetworkPermissions} for help.`)
        this.errors++
      }
    } catch (err) {
      spinner.fail('Unable to read Android manifest.')
      cli.logNote(`  See ${fix.androidNetworkPermissions} for help.`)
      this.errors++
    }
  }

  async checkAndroidApproov(sync = false) {
    if (this.checkedAndroidApproov) return

    if (!this.checkedApproovPackage) await this.checkApproovPackage()
    if (!this.hasApproovPackage) return
    if (!this.checkedAndroidTarget) await this.checkAndroidTarget()
    if (!this.hasAndroidTarget) return

    const spinner = cli.spinner().start(`Checking for installed Approov components in the Android target...`)

    if (!sync && this.hasApproovPackage) {
      spinner.error('No Approov components found in the Android target.')
      this.errors++
      cli.logNote(`  See ${fix.AndroidApproov} for help.`)
    } else {
      spinner.succeed('No Approov components found in the Android target.')
    }
    this.hasAndroidApproov = false
    this.checkedAndroidApproov = true
  }

  async checkIosTarget() {
    if (this.checkedIosTarget) return

    if (!this.checkedReactNative) await this.checkReactNative()
    if (!this.hasReactNative) return
    if (!this.checkedApproovVersion) await this.checkApproovVersion()
    if (!this.hasApproovVersion) return

    const spinner = cli.spinner().start(`Checking for iOS target...`)
    const projName = path.basename(this.dir)

    const wsDir = path.join(this.dir, 'ios', `${projName}.xcworkspace`)
    if (!fsx.isDirectory(wsDir)) {
      spinner.fail('Project does not contain a recognizable iOS workspace')
      cli.logNote(`  See ${fix.iosTarget} for help.`)
      this.warnings++
      this.hasIosTarget = false
      this.checkedIosTarget = true
      return
    }
    const pbxFile = path.join(this.dir, 'ios', `${projName}.xcodeproj`, 'project.pbxproj')
    if (!fsx.isFile(pbxFile)) {
      spinner.fail('Project does not contain a recognizable iOS project')
      cli.logNote(`  See ${fix.iosTarget} for help.`)
      this.error++
      this.hasIosTarget = false
      this.checkedIosTarget = true
      return
    }
    spinner.succeed(`Found iOS target.`)
    this.hasIosTarget = true
    this.checkedIosTarget = true

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
      spinner.fail(`Approov requires a minimum iOS deployment target of \'${this.approovVersion.iosMinVersion}\'; unable to find a minimum target.`)
      cli.logNote(`  See ${fix.iosTarget} for help.`)
      this.error++
    } else if (!compareVersions.compare(version, this.approovVersion.iosMinVersion, '>=')) {
      spinner.fail(`Approov requires a minimum iOS deployment target of \'${this.approovVersion.iosMinVersion}\'; found only \'${version}\'.`)
      cli.logNote(`  See ${fix.iosTarget} for help.`)
      this.error++
    } else {
      spinner.succeed(`Found iOS deployment target of \'${version}\'.`)
    }
  }

  async checkIosApproov(sync = false) {
    if (this.checkedIosApproov) return

    if (!this.checkedApproovPackage) await this.checkApproovPackage()
    if (!this.hasApproovPackage) return
    if (!this.checkedIosTarget) await this.checkIosTarget()
    if (!this.hasIosTarget) return

    const spinner = cli.spinner().start(`Checking for installed Approov components in the iOS target...`)

    if (!sync && this.hasApproovPackage) {
      spinner.error('No Approov components found in the iOS target.')
      this.errors++
      cli.logNote(`  See ${fix.iosApproov} for help.`)
    } else {
      spinner.succeed('No Approov components found in the iOS target.')
    }
    this.hasIosApproov = false
    this.checkedIosApproov = true
  }

  async checkAll() {
    await this.checkReactNative()
    if (!this.hasReactNative) return

    await this.checkApproovCLI()
    if (!this.hasApproovCLI) return
    await this.checkApproovAPIs()

    await this.checkApproovVersion()
    if (!this.hasApproovVersion) return

    await this.checkApproovPackage()

    await this.checkAndroidTarget()
    await this.checkAndroidApproov()

    await this.checkIosTarget()
    await this.checkIosApproov()
  }

  summarize() {
    cli.logNote('')
    if (this.errors == 0 && this.warnings == 0) {
      cli.logSuccess("All checks completed successfully")
    } else if (this.errors > 0) {
      cli.logError(`Found ${this.errors} error${this.errors!=1?'s':''}, ${this.warnings} warning${this.warnings!=1?'s':''}`)
    } else {
      cli.logWarning(`Found ${this.errors} error${this.errors!=1?'s':''}, ${this.warnings} warning${this.warnings!=1?'s':''}`)
    }
  }
}

module.exports = Checker
