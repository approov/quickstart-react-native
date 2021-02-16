const { Command } = require('commander')
const { Project, help, Log }  = require('../project')
const chalk = require('chalk')

const link = help('approovAPIDomains')

const command = (new Command())

.name('check')
.description('Check Approov integration in the current app')

.option('--approov <version>', 'Approov version', 'latest')

.action(async (opts) => {
  const log = new Log()

  let errors = 0
  let warnings = 0
  const complete = () => {
    log.note()
    if (errors == 0 && warnings == 0) {
      log.succeed("All checks completed successfully")
    } else if (errors == 0) {
      log.warn(`Found${errors} error${errors!=1?'s':''}, ${warnings} warning${warnings!=1?'s':''}`)
    } else {
      log.exit(`Found ${errors} error${errors!=1?'s':''}, ${warnings} warning${warnings!=1?'s':''}`)
    }
  }

  const project = new Project(process.cwd(), opts['approov'])
  const help = project.specs.refs
  
  // check Approov Version

  log.spin("Checking Approov version...")
  if (!project.specs.isSupported) {
    log.fail('Directory does not appear to be an npm project.')
    log.help('approovVersions')
    errors++
    complete()
  }
  log.succeed(`Using Approov version ${project.specs.version}.`)

  // check ReactNative

  log.spin("Checking if a React Native project...")
  if (!project.isPackage()) {
    log.fail('Directory does not appear to be an npm project.')
    log.help('reactNativeProject')
    errors++
    complete()
  }
  const version = project.getReactNativeVersion()
  if (!version) {
    log.succeed(`Found an npm project.`)
    log.fail('Found no React Native package.')
    log.help('reactNativeProject')
    errors++
    complete()
  }
  if (!project.isReactNativeVersionSupported(version)) {
    log.succeed(`Found a React Native project.`)
    log.fail(`Approov requires a React Native version >= ${project.specs.reactNativeMinVersion}; found version ${version}.`)
    log.help('reactNativeProject')
    errors++
    complete()
  }
  log.succeed(`Found a React Native project.`)
  log.succeed(`Found React Native version ${version}.`)

  // check Approov CLI

  log.spin(`Checking for the Approov CLI...`)
  if (!await project.checkingIfApproovCLIActive()) {
    if (!project.isApproovCLIFound()) {
      log.fail('The Approov CLI is not installed or not in the current PATH.')
    } else {
      log.fail('The Approov CLI is not active.')
    }
    log.help('approovCLI')
    errors++
  } else {
    log.succeed(`Found a working Approov CLI.`)
    const apiDomains = await project.findingProtectedAPIDomains()
    if (apiDomains.length <= 0) {
      log.warn('No protected API Domains found')
      warnings++
    } else {
      log.info(`Approov is currently protecting these API domains:`)
      apiDomains.forEach(domain => log.info(chalk.green(`  ${domain}`)))
    }
    log.info(`To add or remove API domains, see ${link}.`)
  }

  // check Approov package

  log.spin(`Checking if \'@approov/react-native-approov\` package is installed...`)
  if (!project.isApproovPackageInstalled()) {
    log.info('The \'@approov/react-native-approov\` package is not installed')
  } else {
    log.succeed('The \'@approov/react-native-approov\` package is installed')
  }

  // check Android project

  log.spin(`Checking for Android project...`)
  if (!project.isAndroidProject()) {
    log.warn('No Android project found.')
    log.info('Skipping additional Android checks.')
    log.help('androidProject')
    warnings++
  } else {
    log.succeed(`Found Android project.`)

    log.spin(`Checking for Android minimum SDK...`)
    const minSDK = await project.findingAndroidMinSDK()
    if (!minSDK) {
      log.fail(`Found no Android minimum SDK; >= ${project.specs.andrdoidMinSDK} required.`)
      log.help('androidProject')
      errors++
    } else if (!project.isAndroidMinSDKSupported(minSDK)) {
      log.fail(`Found Android minimum SDK ${minSDK}; >= ${project.specs.androidMinSDK} required.`)
      log.help('androidProject')
      errors++
    } else {
      log.succeed(`Found Android minimum SDK ${minSDK}.`)
    }

    log.spin('Checking for Android network permissions...')
    const permissions = await project.findingAndroidNetworkPermissions()
    if (!permissions.includes('android.permission.INTERNET')) {
      log.fail('Missing required \'android.permission.INTERNET\' in Android manifest.')
      log.help('androidNetworkPermissions')
      errors++
    } else {
      log.succeed('Found \'android.permission.INTERNET\' in Android manifest.')
    }
    if (!permissions.includes('android.permission.INTERNET')) {
      log.fail('Missing required \'android.permission.ACCESS_NETWORK_STATE\' in Android manifest.')
      log.help('androidNetworkPermissions')
      errors++
    } else {
      log.succeed('Found \'android.permission.ACCESS_NETWORK_STATE\' in Android manifest.')
    }

    if (project.isApproovPackageInstalled()) {
      log.spin('Checking for Android approov components...')
      if (!project.hasAndroidApproovSDK()) {
        log.fail('Missing Approov Android SDK.')
        log.help('androidApproov')
        errors++
      } else {
        log.succeed('Found Approov Android SDK.')
      }
      log.spin('Checking for Android approov components...')
      if (!project.hasAndroidApproovConfig()) {
        log.fail('Missing Approov Android config file.')
        log.help('androidApproov')
        errors++
      } else {
        log.succeed('Found Approov Android config file.')
      }
      log.spin('Checking for Android approov components...')
      if (!project.hasAndroidApproovProps()) {
        log.fail('Missing Approov Android properties file.')
        log.help('androidApproov')
        errors++
      } else {
        log.succeed('Found Approov Android properties file.')
      }
    }
  }

  // check iOS Project

  log.spin(`Checking for iOS project...`)
  if (!project.isIosProject()) {
    log.warn('No iOS project found.')
    log.info('Skipping additional iOS checks.')
    log.help('iosProject')
    warnings++
  } else {
    log.succeed(`Found iOS project.`)

    log.spin(`Checking for iOS deployment target...`)
    const target = await project.findingIosDeploymentTarget()
    if (!target) {
      log.fail(`Found no iOS deployment target; >= ${project.specs.iosMinDeploymentTarget} required.`)
      log.help('iosProject')
      errors++
    } else if (!project.isIosDeploymentTargetSupported(target)) {
      log.fail(`Found iOS deployment target ${target}; >= ${project.specs.iosMinDeploymentTarget} required.`)
      log.help('iosProject')
      errors++
    } else {
      log.succeed(`Found iOS deployment target ${target}.`)
    }

    if (project.isApproovPackageInstalled()) {
      log.spin('Checking for iOS Approov components1...')
      if (!project.hasIosApproovSDK()) {
        log.fail('Missing iOS Approov SDK.')
        log.help('iosApproov')
        errors++
      } else {
        log.succeed('Found iOS Approov SDK.')
      }
      log.spin('Checking for iOS Approov components2...')
      if (!project.hasIosApproovConfig()) {
        log.fail('Missing iOS Approov config file.')
        log.help('iosApproov')
        errors++
      } else {
        log.succeed('Found iOS Approov config file.')
      }
      log.spin('Checking for iOS Approov components3...')
      if (!project.hasIosApproovProps()) {
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
