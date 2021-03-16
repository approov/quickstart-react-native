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
const Project = require('./project')
const Log = require('./log')
const sh = require('./sh')

// As my general convention, functions returning promises use verbs ending in '-ing', so for example:
// - writeFile() is a synchronous function
// - writingFile is an asynchronous function

class Action {
  constructor(dir = process.cwd()) {
    this.project = new Project(dir)
    this.log = new Log()
    this.warnings = 0
    this.errors = 0

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

  unexpected(err) { 
    this.log.fail(`UnUnexpected error: ${err.message}.`)
    this.log.help('contactSupport')
    this.errors++
  }

  async checkingProject() {
    const project = this.project
    const log = this.log

    log.spin('Checking Project...')
    await project.checkingProject()
    if (!project.isPkg) {
      log.fail(`No project.json found in ${project.dir}.`)
      log.help('reactNativeProject')
      this.errors++
      throw new Error(`No project.json found in ${project.dir}.`)
    }
    log.succeed(`Found project.json in ${project.dir}.`)
  }

  async checkingReactNative() {
    const project = this.project
    const log = this.log

    log.spin('Checking React Native project...')
    await project.checkingReactNative()
    if (!project.reactNative.version) {
      log.fail('React Native package not found.')
      log.help('reactNativeProject')
      this.errors++
      throw new Error('React Native package not found.')
    }
    if (!project.reactNative.isVersionSupported) {
      log.succeed(`Found React Native version ${project.reactNative.version}.`)
      log.fail(`Approov requires a React Native version >= ${project.reactNative.minVersion}.`)
      log.help('reactNativeProject')
      this.errors++
      throw new Error(`Approov requires a React Native version >= ${project.reactNative.minVersion}.`)
    }
    log.succeed(`Found React Native version ${project.reactNative.version}.`)
  }

  async checkingApproovCli() {
    const project = this.project
    const log = this.log

    log.spin(`Checking for Approov CLI...`)
    await project.checkingApproovCli()
    if (!project.approov.cli.isActive) {
      if (!project.approov.cli.isFound) {
        log.fail('Approov CLI not found; check PATH.')
      } else {
        log.fail('Approov CLI found, but no active session. Ensure a role is set and a session is active, entering a password if necessary.')
      }
      log.help('approovCLI')
      this.errors++
      throw new Error('Approov CLI not found or no active session.')
    }
    log.succeed(`Found Approov CLI with active session.`)
  }

  async findingApproovApiDomains() {
    const project = this.project
    const log = this.log

    log.spin(`Finding Approov protected API domains...`)
    await project.findingApproovApiDomains()    
    if (project.approov.api.domains.length <= 0) {
      log.warn('No protected API Domains found')
      this.warnings++
    } else {
      log.info(`Approov is currently protecting these API domains:`)
      project.approov.api.domains.forEach(domain => log.info(chalk.green(`  ${domain}`)))
    }
    log.info(`To add or remove API domains, see ${config.refs['approovAPIDomains']}.`)
  }

  async checkingApproovPackage() {
    const project = this.project
    const log = this.log

    log.spin(`Checking for \'@approov/react-native-approov\` package...`)
    await project.checkingApproovPkg()
    if (!project.approov.pkg.isInstalled) {
      log.info('The @approov/react-native-approov package is not installed')
    } else {
      log.succeed('Found @approov/react-native-approov package')
    }
  }

  async installingApproovPackage() {
    const project = this.project
    const log = this.log

    log.spin(`Checking if \'@approov/react-native-approov\` package is installed...`)
    if (!project.approov.pkg.isInstalled) {
      log.note(`Installing the @approov/react-native-approov package...`)
      await project.installingApproovPkg()
      if (!project.approov.pkg.isInstalled) {
        log.fail(`Failed to install @approov/react-native-approov package`)
        log.help('contactSupport')
        this.errors++
        throw new Error('Failed to install @approov/react-native-approov package')
      }
      log.succeed(`Installed @approov/react-native-approov package`)
    } else {
      log.succeed('The @approov/react-native-approov package is already installed')
    }
  }

  async checkingAndroidProject() {
    const project = this.project
    const log = this.log

    log.spin(`Checking for Android project...`)
    if (!project.reactNative.hasAndroid) {
      log.warn('No Android project found.')
      log.info('Skipping additional Android checks.')
      log.help('androidProject')
      this.warnings++
    } else {
      log.succeed(`Found Android project.`)
      log.spin(`Checking Android project...`)
      await project.checkingAndroidProject()
      if (!project.android.minSdk) {
        log.fail(`Found no Android minimum SDK; >= ${project.android.minMinSdk} required.`)
        log.help('androidProject')
        this.errors++
      } else if (!project.android.isMinSdkSupported) {
        log.fail(`Found Android minimum SDK ${project.android.minSdk}; >= ${project.android.minMinSdk} required.`)
        log.help('androidProject')
        this.errors++
      } else {
        log.succeed(`Found Android minimum SDK ${project.android.minSdk}.`)
      }
  
      if (!project.android.permitsNetworking) {
        Object.keys(project.android.networkPermissions).forEach(p => {
          if (!project.android.networkPermissions[p]) {
            log.fail(`Missing required ${p} in Android manifest.`)
            log.help('androidProject')
            this.errors++
          }
        })
      } else {
        log.succeed('Found required Android network permissions.')
      }
  
      if (project.approov.pkg.isInstalled) {
        log.spin(`Checking for Android Approov components...`)
        await project.checkingAndroidApproov()
        if (!project.android.approov.hasSdk) {
          log.fail('Missing Android Approov SDK.')
          log.help('androidApproov')
          this.errors++
        } else {
          log.succeed('Found Android Approov SDK.')
        }
        if (!project.android.approov.hasConfig) {
          log.fail('Missing Android Approov config file.')
          log.help('androidApproov')
          this.errors++
        } else {
          log.succeed('Found Android Approov config file.')
        }
        if (!project.android.approov.hasProps) {
          log.fail('Missing Android Approov properties file.')
          log.help('androidApproov')
          this.errors++
        } else {
          log.succeed('Found Android Approov properties file.')
        }
      }
    }
  }

  async installingAndroidFiles(props) {
    const project = this.project
    const log = this.log

    if (project.reactNative.hasAndroid) {
      log.note(`Installing Android Approov SDK library...`)
      await project.installingAndroidApproovSdk()
      if (!project.android.approov.hasSdk) {
        log.fail('Failed to install Android Approov SDK library.')
        log.help('contactSupport')
        this.errors++
        throw new Error('Failed to install Android Approov SDK library.')
      }
      log.succeed(`Installed Android Approov SDK library.`)

      log.note(`Installing Android Approov config file...`)
      await project.installingAndroidApproovConfig()
      if (!project.android.approov.hasConfig) {
        log.fail('Failed to install Android Approov config file.')
        log.help('contactSupport')
        this.errors++
        throw new Error('Failed to install Android Approov config file.')
      }
      log.succeed(`Installed Android Approov config file.`)

      log.spin(`Installing Android Approov props file...`)
      await project.installingAndroidApproovProps(props)
      if (!project.android.approov.hasProps) {
        log.fail('Failed to install Android Approov props file.')
        log.help('contactSupport')
        this.errors++
        throw new Error('Failed to install Android Approov props file.')
      }
      log.succeed(`Installed Android Approov props file.`)
    }
  }

  async checkingAndroidBuild() {
    const project = this.project
    const log = this.log

    log.spin(`Checking for Android debug APK`)
    await project.checkingAndroidBuild()
    if (!project.android.build.hasApk) {
      log.fail(`Approov debug APK ${project.android.build.apkPath} not found`)
      log.info(`Has \`react-native run-android\` been run?`)
      this.errors++
      throw new Error(`Approov debug APK ${project.android.build.apkPath} not found`)
    }
    log.succeed(`Found Android debug APK.`)
  }

  async registerAndroidApk() {
    const project = this.project
    const log = this.log

    log.note(`Registering Android debug APK`)
    await project.registeringAndroidBuild(opts.expireAfter)
    if (!project.android.build.isRegistered) {
      log.fail(`Unable to register debug APK ${project.android.build.apkPath}.`)
      log.help('contactSupport')
      this.errors++
      throw new Error(`Unable to register debug APK ${project.android.build.apkPath}.`)
    }
    log.succeed(`Registered the debug APK ${project.android.build.apkPath} for ${project.android.build.expireAfter}.`)
  }

  async checkingIosProject() {
    const project = this.project
    const log = this.log

    log.spin(`Checking for iOS project...`)
    if (!project.isIosDevPlatform) {
      log.warn('Not on an iOS-compatible development platform')
      log.info('Skipping additional iOS checks.')
      log.help('iosProject')
      this.warnings++
    } else if (!project.reactNative.hasIos) {
      log.warn('No iOS project found.')
      log.info('Skipping additional iOS checks.')
      log.help('iosProject')
      this.warnings++
    } else if (!project.ios.hasXcodebuild) {
      log.warn('Missing Xcode command line tools (xcodebuild).')
      log.info('Skipping additional iOS checks.')
      log.help('iosProject')
      this.warnings++
    } else {
      log.succeed(`Found iOS project.`)
      log.spin(`Checking iOS project...`)
      await project.checkingIosProject()
      if (!project.ios.deployTarget) {
        log.fail(`Found no iOS deployment target; >= ${project.ios.minDeployTarget} required.`)
        log.help('iosProject')
        this.errors++
      } else if (!project.ios.isDeployTargetSupported) {
        log.fail(`Found iOS deployment target ${project.ios.deployTarget}; >= ${project.ios.minDeployTarget} required.`)
        log.help('iosProject')
        this.errors++
      } else {
        log.succeed(`Found iOS deployment target ${project.ios.deployTarget}.`)
      }
  
      if (project.approov.pkg.isInstalled) {
        log.spin(`Checking for iOS Approov components...`)
        await project.checkingIosApproov()
        if (!project.ios.approov.hasSdk) {
          log.fail('Missing iOS Approov SDK.')
          log.help('iosApproov')
          this.errors++
        } else {
          log.succeed('Found iOS Approov SDK.')
        }
        if (!project.ios.approov.hasConfig) {
          log.fail('Missing iOS Approov config file.')
          log.help('iosApproov')
          this.errors++
        } else {
          log.succeed('Found iOS Approov config file.')
        }
        if (!project.ios.approov.hasProps) {
          log.fail('Missing iOS Approov properties file.')
          log.help('iosApproov')
          this.errors++
        } else {
          log.succeed('Found iOS Approov properties file.')
        }
      }
    }
  }

  async installingIosFiles(props) {
    const project = this.project
    const log = this.log

    if (project.reactNative.hasIos) {
      log.note(`Installing iOS Approov SDK library...`)
      await project.installingIosApproovSdk()
      if (!project.ios.approov.hasSdk) {
        log.fail('Failed to install iOS Approov SDK library.')
        log.help('contactSupport')
        this.errors++
        throw new Error('Failed to install iOS Approov SDK library.')
      }
      log.succeed(`Installed iOS Approov SDK library.`)

      log.note(`Installing iOS Approov config file...`)
      await project.installingIosApproovConfig()
      if (!project.ios.approov.hasConfig) {
        log.fail('Failed to install iOS Approov config file.')
        log.help('contactSupport')
        this.errors++
        throw new Error('Failed to install iOS Approov config file.')
      }
      log.succeed(`Installed iOS Approov config file.`)

      log.spin(`Installing iOS Approov props file...`)
      await project.installingIosApproovProps(props)
      if (!project.ios.approov.hasProps) {
        log.fail('Failed to install iOS Approov props file.')
        log.help('contactSupport')
        this.errors++
        throw new Error('Failed to install iOS Approov props file.')
      }
      log.succeed(`Installed iOS Approov props file.`)
    }

    if (sh.which('pod')) {
      log.note(`Updating iOS pods...`)
      await project.updatingIosPods()
      if (!project.ios.updatedPods) {
        log.fail('Failed to update iOS pods.')
        log.help('contactSupport')
        this.errors++
        throw new Error('Failed to update iOS pods.')
      }
      log.succeed(`Updated iOS pods.`)
    } else {
      log.warn(`Skipping ${appName} iOS pod dependencies; pod installation not available.`)
      warnings++
    }
  }
}

module.exports = Action
