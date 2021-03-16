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

const chalk = require('chalk')
const config = require('./config')
const task = require('./task')
const { Log, LogError } = require('../util')

class Project {
  constructor(dir = process.cwd()) {
    this.log = new Log()
    this.warnings = 0
    this.errors = 0

    this.dir = dir,
    this.hasAndroid = false,
    this.hasIos = false,
    this.canBuildIos = false

    this.log.note()
  }

  complete(successMsg, warningMsg, errorMsg) {
    const log = this.log

    log.note()
    if (this.errors == 0 && this.warnings == 0) {
      if (successMsg) log.succeed(successMsg)
    } else if (this.errors == 0) {
      if (warningMsg) log.succeed(warningMsg)
      log.warn(`Found ${this.errors} error${this.errors!=1?'s':''}, ${this.warnings} warning${this.warnings!=1?'s':''}`)
    } else {
      if (errorMsg) log.succeed(errorMsg)
      log.exit(`Found ${this.errors} error${this.errors!=1?'s':''}, ${this.warnings} warning${this.warnings!=1?'s':''}`)
    }
  }

  ref(id) {
    return config.refs[id] || config.refs['contactSupport']
  }

  handleError(err) { 
    if (!(err instanceof LogError)) {
      throw err // uncomment to see stack trace during debug
      this.errors++
      this.log.fail(`UnUnexpected error: ${err.message}.`)
      this.log.help(this.ref('contactSupport'))
    }
  }

  async checkingReactNative() {
    this.log.spin('Checking Project...')
    if (!task.hasPackageSpec(this.dir)) {
      this.errors++
      this.log.fatal(`No project.json found in ${this.dir}.`, this.ref('reactNativeProject'))
    }
    this.log.succeed(`Found project.json in ${this.dir}.`)

    if (!task.hasYarn()) {
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
      this.log.fatal(`Approov requires a React Native version >= ${minVersion}.`, this.ref('reactNativeProject'))
    }
    this.log.succeed(`Found React Native version ${version}.`)
  }

  async checkingApproovCli() {
    this.log.spin(`Checking for Approov CLI...`)
    if (!task.hasApproovCli()) {
      this.errors++
      log.fatal('Approov CLI not found in PATH.', 'approovCLI')
    }
    if (!await task.checkingApproovSessionActive()) {
      this.errors++
      log.fatal('Approov CLI found, but no active session. Ensure a role is set and a session is active, entering a password if necessary.', this.ref('approovCLI'))
    }
    this.log.succeed(`Found Approov CLI with active session.`)
  }

  async findingApproovApiDomains() {
    this.log.spin(`Finding Approov protected API domains...`)
    const apiDomains = await task.findingApproovApiDomains()
    if (apiDomains.length <= 0) {
      this.warnings++
      this.log.warn('No protected API Domains found')
    } else {
      this.log.info(`Approov is currently protecting these API domains:`)
      apiDomains.forEach(domain => this.log.info(chalk.green(`  ${domain}`)))
    }
    this.log.info(`To add or remove API domains, see ${config.refs['approovAPIDomains']}.`)
  }

  async checkingApproovPackage() {
    this.log.spin(`Checking for \'@approov/react-native-approov\` package...`)
    if (!task.hasApproovPackage(this.dir)) {
      this.log.info('The @approov/react-native-approov package is not installed')
    } else {
      this.log.succeed('Found @approov/react-native-approov package')
    }
  }

  async installingApproovPackage() {
    this.log.spin(`Checking if \'@approov/react-native-approov\` package is installed...`)
    if (!task.hasApproovPackage(this.dir)) {
      this.log.note(`Installing the @approov/react-native-approov package...`)
      if (!await task.installingApproovPackage(this.dir)) {
        this.errors++
        this.log.fatal(`Failed to install @approov/react-native-approov package`, this.ref('contactSupport'))
      }
      this.log.succeed(`Installed @approov/react-native-approov package`)
    } else {
      this.log.succeed('The @approov/react-native-approov package is already installed')
    }
  }

  async checkingAndroidProject() {
    this.log.spin(`Checking for Android project...`)
    if (!task.hasAndroidPath(this.dir)) {
      this.warnings++
      this.log.warn('No Android project found.')
      this.log.info('Skipping additional Android checks.', this.ref('androidProject'))
    } else {
      this.log.succeed(`Found Android project.`)

      this.log.spin(`Checking Android min SDK...`)
      const minMinSdk = config.specs.android.minSdk
      const minSdk = await task.findingAndroidMinSdk(this.dir)
      if (!minSdk) {
        this.errors++
        this.log.fail(`Found no Android minimum SDK; >= ${project.android.minMinSdk} required.`, this.ref('androidProject'))
      } else if (!task.isAndroidMnSdkSupported(minSdk, minMinSdk)) {
        this.errors++
        this.log.fail(`Found Android minimum SDK ${minSdk}; >= ${minMinSdk} required.`, this.ref('androidProject'))
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
          this.log.fail(`Missing required ${p} in Android manifest.`, 'androidProject')
        }
      })
      if (hasPermissions) {
        this.log.succeed('Found required Android network permissions.')
      }
  
      if (task.hasApproovPackage(this.dir)) {
        this.log.spin(`Checking for Android Approov components...`)
        if (!task.hasAndroidApproovSdk(this.dir)) {
          this.errors++
          this.log.fail('Missing Android Approov SDK.', this.ref('androidApproov'))
        } else {
          this.log.succeed('Found Android Approov SDK.')
        }
        if (!task.hasAndroidApproovConfig(this.dir)) {
          this.errors++
          this.log.fail('Missing Android Approov config file.', this.ref('androidApproov'))
        } else {
          this.log.succeed('Found Android Approov config file.')
        }
        if (!task.hasAndroidApproovProps(this.dir)) {
          this.errors++
          this.log.fail('Missing Android Approov properties file.', this.ref('androidApproov'))
        } else {
          this.log.succeed('Found Android Approov properties file.')
        }
      }
    }  
  }

  async installingAndroidFiles(props) {
    if (task.hasAndroidPath(this.dir)) {
      this.log.note(`Installing Android Approov SDK library...`)
      let isInstalled = await task.installingAndroidApproovSdk(this.dir)
      if (!isInstalled) {
        this.errors++
        this.log.fatal('Failed to install Android Approov SDK library.', this.ref('contactSupport'))
      }
      this.log.succeed(`Installed Android Approov SDK library.`)

      this.log.note(`Installing Android Approov config file...`)
      isInstalled = await task.installingAndroidApproovConfig(this.dir)
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
      this.log.fail(`Approov ${variant} APK not found.`)
      this.log.info(`Has \`react-native run-android${variant!=='debug'? ` --variant=${variant}`:''}\` been run?`)
      throw new LogError(`Approov ${variant} APK not found.`)
    }
    this.log.succeed(`Found the Android ${variant} APK.`)

    this.log.note(`Registering Android debug APK`)
    const isRegistered = await task.registeringAndroidApk(this.dir, variant, expireAfter)
    if (!isRegistered) {
      this.errors++
      this.log.fatal(`Unable to register the ${variant} APK.`, this.ref('approovReg'))
    }
    this.log.succeed(`Registered the ${variant} APK for ${expireAfter}.`)
  }

  // async checkingIosProject() {
  //   const project = this.project
  //   const log = this.log

  //   log.spin(`Checking for iOS project...`)
  //   if (!project.isIosDevPlatform) {
  //     log.warn('Not on an iOS-compatible development platform')
  //     log.info('Skipping additional iOS checks.')
  //     log.help('iosProject')
  //     this.warnings++
  //   } else if (!project.reactNative.hasIos) {
  //     log.warn('No iOS project found.')
  //     log.info('Skipping additional iOS checks.')
  //     log.help('iosProject')
  //     this.warnings++
  //   } else if (!project.ios.hasXcodebuild) {
  //     log.warn('Missing Xcode command line tools (xcodebuild).')
  //     log.info('Skipping additional iOS checks.')
  //     log.help('iosProject')
  //     this.warnings++
  //   } else {
  //     log.succeed(`Found iOS project.`)
  //     log.spin(`Checking iOS project...`)
  //     await project.checkingIosProject()
  //     if (!project.ios.deployTarget) {
  //       log.fail(`Found no iOS deployment target; >= ${project.ios.minDeployTarget} required.`)
  //       log.help('iosProject')
  //       this.errors++
  //     } else if (!project.ios.isDeployTargetSupported) {
  //       log.fail(`Found iOS deployment target ${project.ios.deployTarget}; >= ${project.ios.minDeployTarget} required.`)
  //       log.help('iosProject')
  //       this.errors++
  //     } else {
  //       log.succeed(`Found iOS deployment target ${project.ios.deployTarget}.`)
  //     }
  
  //     if (project.approov.pkg.isInstalled) {
  //       log.spin(`Checking for iOS Approov components...`)
  //       await project.checkingIosApproov()
  //       if (!project.ios.approov.hasSdk) {
  //         log.fail('Missing iOS Approov SDK.')
  //         log.help('iosApproov')
  //         this.errors++
  //       } else {
  //         log.succeed('Found iOS Approov SDK.')
  //       }
  //       if (!project.ios.approov.hasConfig) {
  //         log.fail('Missing iOS Approov config file.')
  //         log.help('iosApproov')
  //         this.errors++
  //       } else {
  //         log.succeed('Found iOS Approov config file.')
  //       }
  //       if (!project.ios.approov.hasProps) {
  //         log.fail('Missing iOS Approov properties file.')
  //         log.help('iosApproov')
  //         this.errors++
  //       } else {
  //         log.succeed('Found iOS Approov properties file.')
  //       }
  //     }
  //   }
  // }

  // async installingIosFiles(props) {
  //   const project = this.project
  //   const log = this.log

  //   if (project.reactNative.hasIos) {
  //     log.note(`Installing iOS Approov SDK library...`)
  //     await project.installingIosApproovSdk()
  //     if (!project.ios.approov.hasSdk) {
  //       log.fail('Failed to install iOS Approov SDK library.')
  //       log.help('contactSupport')
  //       this.errors++
  //       throw new Error('Failed to install iOS Approov SDK library.')
  //     }
  //     log.succeed(`Installed iOS Approov SDK library.`)

  //     log.note(`Installing iOS Approov config file...`)
  //     await project.installingIosApproovConfig()
  //     if (!project.ios.approov.hasConfig) {
  //       log.fail('Failed to install iOS Approov config file.')
  //       log.help('contactSupport')
  //       this.errors++
  //       throw new Error('Failed to install iOS Approov config file.')
  //     }
  //     log.succeed(`Installed iOS Approov config file.`)

  //     log.spin(`Installing iOS Approov props file...`)
  //     await project.installingIosApproovProps(props)
  //     if (!project.ios.approov.hasProps) {
  //       log.fail('Failed to install iOS Approov props file.')
  //       log.help('contactSupport')
  //       this.errors++
  //       throw new Error('Failed to install iOS Approov props file.')
  //     }
  //     log.succeed(`Installed iOS Approov props file.`)
  //   }

  //   if (sh.which('pod')) {
  //     log.note(`Updating iOS pods...`)
  //     await project.updatingIosPods()
  //     if (!project.ios.updatedPods) {
  //       log.fail('Failed to update iOS pods.')
  //       log.help('contactSupport')
  //       this.errors++
  //       throw new Error('Failed to update iOS pods.')
  //     }
  //     log.succeed(`Updated iOS pods.`)
  //   } else {
  //     log.warn(`Skipping ${appName} iOS pod dependencies; pod installation not available.`)
  //     warnings++
  //   }
  // }
}

module.exports = Project
