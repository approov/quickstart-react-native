/*
 * MIT License
 *
 * Copyright (c) 2016-present, CriticalBlue Ltd.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute,
 * sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all copies or
 * substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
 * NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT
 * OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

//const chalk = require('chalk')
const config = require('./config')
const task = require('./task')
const { Log, LogError } = require('../util')

class Project {
  constructor(dir = process.cwd()) {
    this.log = new Log()
    this.warnings = 0
    this.errors = 0

    this.dir = dir
    this.hasAndroid = false
    this.hasIos = false
    this.canBuildIos = false

    this.log.note()
  }

  complete(successMsg, warningMsg, errorMsg) {
    this.log.note()
    if (this.errors == 0 && this.warnings == 0) {
      if (successMsg) this.log.succeed(successMsg)
    } else if (this.errors == 0) {
      if (warningMsg) this.log.succeed(warningMsg)
      this.log.warn(`Found ${this.errors} error${this.errors!=1?'s':''}, ${this.warnings} warning${this.warnings!=1?'s':''}`)
    } else {
      if (errorMsg) this.log.succeed(errorMsg)
      this.log.exit(`Found ${this.errors} error${this.errors!=1?'s':''}, ${this.warnings} warning${this.warnings!=1?'s':''}`)
    }
  }

  ref(id) {
    return config.refs[id] || config.refs['contactSupport']
  }

  handleError(err) { 
    if (!(err instanceof LogError)) {
      //throw err // uncomment to see stack trace during debug
      this.errors++
      this.log.fail(`Unexpected error: ${err.message}.`)
      this.log.help(this.ref('contactSupport'))
    }
  }

  async checkingReactNative() {
    this.log.spin('Checking Project...')
    if (!task.hasReactNativePackageSpec(this.dir)) {
      this.errors++
      this.log.fatal(`No project.json found in ${this.dir}.`, this.ref('reactNativeApp'))
    }
    this.log.succeed(`Found project.json in ${this.dir}.`)

    if (!task.hasEnvYarn()) {
      this.errors++
      this.log.fatal(`Yarn not found in PATH; the approov package requires it.`)
    }
    this.log.succeed(`Found yarn in PATH.`)

    this.log.spin('Checking React Native...')
    const version = task.getReactNativeVersion(this.dir)
    const minVersion = config.specs.reactNative.minVersion
    if (!task.isReactNativeVersionSupported(version, minVersion)) {
      this.errors++
      this.log.succeed(`Found React Native version ${version}.`)
      this.log.fatal(`Approov requires a React Native version >= ${minVersion}.`, this.ref('devEnviron'))
    }
    this.log.succeed(`Found React Native version ${version}.`)
  }

  async checkingApproovCli() {
    this.log.spin(`Checking for Approov CLI...`)
    if (!task.hasEnvApproov()) {
      this.errors++
      this.log.fatal('Approov CLI not found in PATH.', this.ref('approovSession'))
    }
    if (!await task.checkingEnvApproovSessionActive()) {
      this.errors++
      this.log.fatal('Approov CLI found, but no active session. Ensure a role is set and a session is active, entering a password if necessary.', this.ref('approovSession'))
    }
    this.log.succeed(`Found Approov CLI with active session.`)
  }

  async checkingApproovPackage() {
    this.log.spin(`Checking for \'@approov/react-native-approov\` package...`)
    if (!task.hasReactNativeApproovPackage(this.dir)) {
      this.log.info('The @approov/react-native-approov package is not installed')
    } else {
      this.log.succeed('Found @approov/react-native-approov package')
    }
  }

  async installingApproovPackage() {
    this.log.spin(`Checking if \'@approov/react-native-approov\` package is installed...`)
    if (!task.hasReactNativeApproovPackage(this.dir)) {
      this.log.note(`Installing the @approov/react-native-approov package...`)
      if (!await task.installingReactNativeApproovPackage(this.dir)) {
        if (task.hasEnvNodeSnap()) {
          this.warnings++
          this.log.warn('Detected Node installed as a Snap package', this.ref('nodeSnap'))
        }
        this.errors++
        this.log.fatal(`Failed to install @approov/react-native-approov package`, this.ref('contactSupport'))
      }
      this.log.succeed(`Installed @approov/react-native-approov package`)
      if (task.isIosSupported()) {
        if (task.hasEnvPod()) {
          this.log.info(`Installing iOS pod dependencies...`)
          const isInstalled = await task.installingIosPods(this.dir)
          if (!isInstalled) {
            this.errors++
            this.log.fatal(`Failed to install iOS pod dependencies`, this.ref('contactSupport'))
          }
          this.log.succeed(`Installed iOS pod dependencies`)
        } else {
          this.warnings++
          this.log.warn(`Skipping iOS pod dependencies; pod install not found in PATH.`)
        }
      } else {
        this.warnings++
        this.log.warn(`Skipping iOS pod dependencies; pod installation for iOS not available on ${task.getEnvPlatform()}`)
      }
    
    } else {
      this.log.succeed('The @approov/react-native-approov package is already installed')
    }
  }

  async checkingAndroidProject() {
    this.log.spin(`Checking for Android project...`)
    if (!task.hasAndroidPath(this.dir)) {
      this.warnings++
      this.log.warn('No Android project found.')
      this.log.info('Skipping additional Android checks.', this.ref('reactNativeApp'))
    } else {
      this.log.succeed(`Found Android project.`)

      this.log.spin(`Checking Android min SDK...`)
      const minMinSdk = config.specs.android.minSdk
      const minSdk = await task.findingAndroidMinSdk(this.dir)
      if (!minSdk) {
        this.errors++
        this.log.fail(`Found no Android minimum SDK; >= ${this.config.android.minSdk} required.`, this.ref('androidMinSdk'))
      } else if (!task.isAndroidMnSdkSupported(minSdk, minMinSdk)) {
        this.errors++
        this.log.fail(`Found Android minimum SDK ${minSdk}; >= ${minMinSdk} required.`, this.ref('androidMinSdk'))
      } else {
        this.log.succeed(`Found Android minimum SDK ${minSdk}.`)
      }
    
      this.log.spin(`Checking Android networking permissions...`)
      const requiredPermissions = config.specs.android.networkPermissions
      const permissions = await task.findingAndroidManifestPermissions(this.dir)
      let hasPermissions = true
      requiredPermissions.forEach(p => {
        if (!permissions.includes(p)) {
          hasPermissions = false
          this.errors++
          this.log.fail(`Missing required ${p} in Android manifest.`, this.ref('androidNetworkPermission'))
        }
      })
      if (hasPermissions) {
        this.log.succeed('Found required Android network permissions.')
      }
  
      if (task.hasReactNativeApproovPackage(this.dir)) {
        this.log.spin(`Checking for Android Approov components...`)
        if (task.hasAndroidApproovConfig(this.dir)) {
          this.log.succeed('Found Android Approov config file.')
        }
        if (task.hasAndroidApproovProps(this.dir)) {
          this.log.succeed('Found Android Approov properties file.')
        }
      }
    }  
  }

  async installingAndroidFiles(props) {
    if (task.hasAndroidPath(this.dir)) {
      this.log.note(`Installing Android Approov config file...`)
      let isInstalled = await task.installingAndroidApproovConfig(this.dir)
      if (!isInstalled) {
        this.errors++
        this.log.fatal('Failed to install Android Approov config file.', this.ref('contactSupport'))
      }
      this.log.succeed(`Installed Android Approov config file.`)

      this.log.note(`Installing Android Approov properties file...`)
      isInstalled = await task.installingAndroidApproovProps(this.dir, props)
      if (!isInstalled) {
        this.errors++
        this.log.fatal('Failed to install Android Approov properties file.', this.ref('contactSupport'))
      }
      this.log.succeed(`Installed Android Approov properties file.`)
    }
  }

  async registeringAndroidApk(variant, expireAfter) {
    this.log.spin(`Checking for Android ${variant} APK...`)
    if (!task.hasAndroidApk(this.dir, variant)) {
      this.errors++
      this.log.fail(`Android ${variant} APK not found.`)
      this.log.info(`Has \`react-native run-android${variant!=='debug'? ` --variant=${variant}`:''}\` been run?`)
      throw new LogError(`Android ${variant} APK not found.`)
    }
    this.log.succeed(`Found the Android ${variant} APK.`)

    this.log.note(`Registering Android ${variant} APK`)
    const isRegistered = await task.registeringAndroidApk(this.dir, variant, expireAfter)
    if (!isRegistered) {
      this.errors++
      this.log.fatal(`Unable to register the ${variant} APK.`, this.ref('registeringApps'))
    }
    this.log.succeed(`Registered the ${variant} APK for ${expireAfter}.`)
  }

  async checkingIosProject() {
    this.log.spin(`Checking for iOS project...`)
    if (!task.hasIosPath(this.dir)) {
      this.warnings++
      this.log.warn('No iOS project found.')
      this.log.info('Skipping additional iOS checks.', this.ref('reactNativeApp'))
    } else if (!task.isIosSupported()){
      this.warnings++
      this.log.warn(`iOS project found but ${task.getEnvPlatform()} does not support iOS development.`)
      this.log.info('Skipping additional iOS checks.')
    } else if (!task.hasEnvXcodebuild()) {
      this.warnings++
      this.log.warn('Missing Xcode command line tools (xcodebuild).')
    } else {
      this.log.succeed(`Found iOS project.`)
      const scheme = task.getIosScheme(this.dir)
      if (!scheme) {
        this.errors++
        this.log.fatal('Failed to find iOS workspace.', this.ref('iosOther'))
      }
      this.log.succeed(`Found iOS workspace - ${scheme}`)

      this.log.spin(`Checking iOS deploy target...`)
      const target = await task.findingIosDeployTarget(this.dir, scheme)
      if (!target) {
        this.errors++
        this.log.fatal('Failed to find iOS deploy target.', this.ref('iosDeployTarget'))
      }
      const minTarget = config.specs.ios.minDeployTarget
      if (!task.isIosDeployTargetSupported(target, minTarget)) {
        this.errors++
        this.log.fail(`Found iOS deployment target ${target}; >= ${minTarget} required.`, this.ref('iosDeployTarget'))
      } else {
        this.log.succeed(`Found iOS deployment target ${target}.`)
      }
  
      if (task.hasReactNativeApproovPackage(this.dir)) {
        this.log.spin(`Checking for iOS Approov components...`)
        if (task.hasIosApproovConfig(this.dir)) {
          this.log.succeed('Found iOS Approov config file.')
        }
        if (task.hasIosApproovProps(this.dir)) {
          this.log.succeed('Found iOS Approov properties file.')
        }

        this.log.info('NOTE: Approov integrated apps will only attest properly on a physical device.')
        this.log.info('      Running on a physical device requires a team be specified for code signing.')
      }
    }  
  }

  async installingIosFiles(props) {
    if (task.hasIosPath(this.dir)) {
      this.log.note(`Installing iOS Approov config file...`)
      let isInstalled = await task.installingIosApproovConfig(this.dir)
      if (!isInstalled) {
        this.errors++
        this.log.fatal('Failed to install iOS Approov config file.', this.ref('contactSupport'))
      }
      this.log.succeed(`Installed iOS Approov config file.`)

      this.log.note(`Installing iOS Approov properties file...`)
      isInstalled = await task.installingIosApproovProps(this.dir, props)
      if (!isInstalled) {
        this.errors++
        this.log.fatal('Failed to install iOS Approov properties file.', this.ref('contactSupport'))
      }
      this.log.succeed(`Installed iOS Approov properties file.`)

      if (!task.isIosSupported()){
        this.warnings++
        this.log.warn(`iOS pods not updated; ${task.getEnvPlatform()} does not support iOS development.`)
      } else {
        if (!task.hasEnvPod()) {
          this.warnings++
          this.log.warn('iOS pods not updated; missing cocoapod command line tool (pod).')
        } else {
          this.log.succeed(`Found iOS project.`)
          isInstalled = await task.installingIosPods(this.dir)
          if (!isInstalled) {
            this.errors++
            this.log.fatal('Failed to update iOS pods.', this.ref('contactSupport'))
          }
        }
        this.log.warn('on iOS, Approov integrated apps will only attest properly on a physical device or simulator set to always pass.')
        this.log.warn('on iOS, when targeting a device, ensure a development team is specified in xcode and the device is properly provisioned.')
      }
    }
  }

  async registeringIosIpa(configuration, expireAfter) {
    const scheme = task.getIosScheme(this.dir)
    if (!configuration) configuration = 'Debug'

    this.log.spin(`Checking for iOS ${configuration} IPA...`)
    const appPath = await task.findingIosAppPath(this.dir, scheme, configuration)
    if (!task.hasIosApp(appPath)) {
      this.errors++
      this.log.fail(`iOS ${configuration} APP not found.`)
      this.log.info(`Has \`react-native run-ios --device ${configuration!=='debug'? ` --configuration=${configuration}`:''}\` been run?`)
      throw new LogError(`iOS ${configuration} APP not found.`)
    }
    const ipaPath = task.getIosIpaPath(this.dir, scheme, configuration)
    if (!task.isIosIpaCurrent(ipaPath, appPath)) {
      this.log.spin(`Building iOS ${configuration} IPA...`)
      const isBuilt = await task.buildingIosIpa(ipaPath, appPath)
      if (!isBuilt) {
        this.errors++
        this.log.fatal('Failed to build iOS ${configuration} IPA.', this.ref('contactSupport'))
      } else {
        this.log.succeed(`Built the iOS ${configuration} IPA.`)
      }
    } else {
      this.log.succeed(`Found the iOS ${configuration} IPA.`)
    }

    this.log.note(`Registering iOS ${configuration} IPA.`)
    const isRegistered = await task.registeringIosIpa(this.dir, scheme, configuration, expireAfter)
    if (!isRegistered) {
      this.errors++
      this.log.fatal(`Unable to register the ${configuration} IPA`, this.ref('registeringApps'))
    }
    this.log.succeed(`Registered the ${configuration} IPA for ${expireAfter}.`)
  }

  async deployingIosApp(configuration) {
    const scheme = task.getIosScheme(this.dir)
    if (!configuration) configuration = 'Debug'

    if (!task.hasEnvIosDeploy()) {
      this.warnings++
      this.log.fatal('Missing iOS deployment tool (ios-deploy).', this.ref('iosDevice'))
    }

    this.log.spin(`Checking for iOS ${configuration} APP...`)
    const appPath = await task.findingIosAppPath(this.dir, scheme, configuration)
    if (!task.hasIosApp(appPath)) {
      this.errors++
      this.log.fail(`iOS ${configuration} APP not found.`)
      this.log.info(`Has \`react-native run-ios --device ${configuration!=='debug'? ` --configuration=${configuration}`:''}\` been run?`)
      throw new LogError(`iOS ${configuration} APP not found.`)
    }

    this.log.note(`Deploying iOS ${configuration} APP.`)
    const isDeployed = await task.deployingIosApp(this.dir, scheme, configuration)
    if (!isDeployed) {
      this.errors++
      this.log.fatal(`Unable to deploy the ${configuration} APP; check for active device.`)
    }
    this.log.succeed(`Deployed the ${configuration} APP.`)
  }
}

module.exports = Project
