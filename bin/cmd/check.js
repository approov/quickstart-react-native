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

 const { Command } = require('commander')
const { config, Project, Log } = require('../project')
const chalk = require('chalk')

const command = (new Command())

.name('check')
.description('Check Approov integration in the current app')

.option('--approov <version>', 'Approov version', config.approovDefaultVersion)

.action(async (opts) => {
  const log = new Log()

  let errors = 0
  let warnings = 0
  const complete = () => {
    log.note()
    if (errors == 0 && warnings == 0) {
      log.succeed("All checks completed successfully")
    } else if (errors == 0) {
      log.warn(`Found ${errors} error${errors!=1?'s':''}, ${warnings} warning${warnings!=1?'s':''}`)
    } else {
      log.exit(`Found ${errors} error${errors!=1?'s':''}, ${warnings} warning${warnings!=1?'s':''}`)
    }
  }

  log.note()
  const project = new Project(process.cwd(), opts['approov'])
  
  // check project

  log.spin('Checking Project...')
  await project.checkingProject()
  if (!project.isPkg) {
    log.fail(`No project.json found in ${project.dir}.`)
    log.help('reactNativeProject')
    errors++
    complete()
  }
  log.succeed(`Found project.json in ${project.dir}.`)
  
  // check Approov Version

  log.spin('Checking Approov version...')
  await project.checkingApproovSdk()
  if (!project.approov.sdk.isSupported) {
    log.fail(`Approov version ${project.approov.sdk.name} not supported`)
    log.help('approovVersions')
    errors++
    complete()
  }
  log.succeed(`Using Approov version ${project.approov.sdk.version}.`)

  // check React Native

  log.spin('Checking React Native project...')
  await project.checkingReactNative()
  if (!project.reactNative.version) {
    log.fail('React Native package not found.')
    log.help('reactNativeProject')
    errors++
    complete()
  }
  if (!project.reactNative.isVersionSupported) {
    log.succeed(`Found React Native version ${project.reactNative.version}.`)
    log.fail(`Approov requires a React Native version >= ${project.reactNative.minVersion}.`)
    log.help('reactNativeProject')
    errors++
    complete()
  }
  log.succeed(`Found React Native version ${project.reactNative.version}.`)

  // check Approov CLI and protected API domains

  log.spin(`Checking for Approov CLI...`)
  await project.checkingApproovCli()
  if (!project.approov.cli.isActive) {
    if (!project.approov.cli.isFound()) {
      log.fail('Approov CLI not found; check PATH.')
    } else {
      log.fail('Approov CLI found, but not responding; check activation.')
    }
    log.help('approovCLI')
    errors++
  } else {
    log.succeed(`Found active Approov CLI.`)
    log.spin(`Finding Approov protected API domains...`)
    await project.findingApproovApiDomains()    
    if (project.approov.api.domains.length <= 0) {
      log.warn('No protected API Domains found')
      warnings++
    } else {
      log.info(`Approov is currently protecting these API domains:`)
      project.approov.api.domains.forEach(domain => log.info(chalk.green(`  ${domain}`)))
    }
    log.info(`To add or remove API domains, see ${config.refs['approovAPIDomains']}.`)
  }

  // check Approov package

  log.spin(`Checking for \'@approov/react-native-approov\` package...`)
  await project.checkingApproovPkg()
  if (!project.approov.pkg.isInstalled) {
    log.info('The @approov/react-native-approov package is not installed')
  } else {
    log.succeed('Found @approov/react-native-approov package')
  }

  // check Android project

  log.spin(`Checking for Android project...`)
  if (!project.reactNative.hasAndroid) {
    log.warn('No Android project found.')
    log.info('Skipping additional Android checks.')
    log.help('androidProject')
    warnings++
  } else {
    log.succeed(`Found Android project.`)
    log.spin(`Checking Android project...`)
    await project.checkingAndroidProject()
    if (!project.android.minSdk) {
      log.fail(`Found no Android minimum SDK; >= ${project.android.minMinSdk} required.`)
      log.help('androidProject')
      errors++
    } else if (!project.android.isMinSdkSupported) {
      log.fail(`Found Android minimum SDK ${project.android.minSdk}; >= ${project.android.minMinSdk} required.`)
      log.help('androidProject')
      errors++
    } else {
      log.succeed(`Found Android minimum SDK ${project.android.minSdk}.`)
    }

    if (!project.android.permitsNetworking) {
      Object.keys(project.android.networkPermissions).forEach(p => {
        if (!project.android.networkPermissions[p]) {
          log.fail(`Missing required ${p} in Android manifest.`)
          log.help('androidNetworkPermissions')
          errors++
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
        errors++
      } else {
        log.succeed('Found Android Approov SDK.')
      }
      if (!project.android.approov.hasConfig) {
        log.fail('Missing Android Approov config file.')
        log.help('androidApproov')
        errors++
      } else {
        log.succeed('Found Android Approov config file.')
      }
      if (!project.android.approov.hasProps) {
        log.fail('Missing Android Approov properties file.')
        log.help('androidApproov')
        errors++
      } else {
        log.succeed('Found Android Approov properties file.')
      }
    }
  }

  // check iOS project

  log.spin(`Checking for iOS project...`)
  if (!project.reactNative.hasIos) {
    log.warn('No iOS project found.')
    log.info('Skipping additional iOS checks.')
    log.help('iosProject')
    warnings++
  } else if (!project.ios.hasXcodebuild) {
    log.warn('Missing Xcode command line tools (xcodebuild).')
    log.info('Skipping additional iOS checks.')
    log.help('iosProject')
    warnings++
  } else {
    log.succeed(`Found iOS project.`)
    log.spin(`Checking iOS project...`)
    await project.checkingIosProject()
    if (!project.ios.deployTarget) {
      log.fail(`Found no iOS deployment target; >= ${project.ios.minDeployTarget} required.`)
      log.help('iosProject')
      errors++
    } else if (!project.ios.isDeployTargetSupported) {
      log.fail(`Found iOS deployment target ${project.ios.deployTarget}; >= ${project.ios.minDeployTarget} required.`)
      log.help('iosProject')
      errors++
    } else {
      log.succeed(`Found iOS deployment target ${project.ios.deployTarget}.`)
    }

    if (project.approov.pkg.isInstalled) {
      log.spin(`Checking for iOS Approov components...`)
      await project.checkingIosApproov()
      if (!project.ios.approov.hasSdk) {
        log.fail('Missing iOS Approov SDK.')
        log.help('iosApproov')
        errors++
      } else {
        log.succeed('Found iOS Approov SDK.')
      }
      if (!project.ios.approov.hasConfig) {
        log.fail('Missing iOS Approov config file.')
        log.help('iosApproov')
        errors++
      } else {
        log.succeed('Found iOS Approov config file.')
      }
      if (!project.ios.approov.hasProps) {
        log.fail('Missing iOS Approov properties file.')
        log.help('iosApproov')
        errors++
      } else {
        log.succeed('Found iOS Approov properties file.')
      }
    }
  }

  // complete

  complete()
})

module.exports = command
