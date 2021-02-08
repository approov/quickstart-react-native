const { Command } = require('commander')
const Project = require('../project')
const { cli } = require('../util')
const chalk = require('chalk')

const command = (new Command())

.name('check')
.description('Check Approov integration in the current app')

.option('--approov <version>', 'Approov version', 'latest')

.action(async (opts) => {
  let errors = 0
  let warnings = 0
  const complete = () => {
    cli.logNote('')
    if (errors == 0 && warnings == 0) {
      cli.logSuccess("All checks completed successfully")
    } else if (errors == 0) {
      cli.logWarning(`Found${errors} error${errors!=1?'s':''}, ${warnings} warning${warnings!=1?'s':''}`)
    } else {
      cli.exitError(`Found ${errors} error${errors!=1?'s':''}, ${warnings} warning${warnings!=1?'s':''}`)
    }
  }

  const project = new Project(process.cwd(), opts['approov'])
  const help = project.specs.refs
  const spinner = cli.spinner()

  cli.clearLine()
  cli.logNote('')
  
  // check Approov Version

  spinner.start("Checking Approov version...")
  if (!project.specs.isSupported) {
    spinner.fail('Directory does not appear to be an npm project.')
    cli.logInfo(`See ${help.approovVersions} for help.`)
    errors++
    complete()
  }
  spinner.succeed(`Using Approov version ${project.specs.version}.`)

  // check ReactNative

  spinner.start("Checking if a React Native project...")
  if (!project.isPackage()) {
    spinner.fail('Directory does not appear to be an npm project.')
    cli.logInfo(`See ${help.reactNativeProject} for help.`)
    errors++
    complete()
  }
  const version = project.getReactNativeVersion()
  if (!version) {
    spinner.succeed(`Found an npm project.`)
    spinner.fail('Found no React Native package.')
    cli.logInfo(`See ${help.reactNativeProject} for help.`)
    errors++
    complete()
  }
  if (!project.isReactNativeVersionSupported(version)) {
    spinner.succeed(`Found a React Native project.`)
    spinner.fail(`Approov requires a React Native version >= ${project.specs.reactNativeMinVersion}; found version ${version}.`)
    cli.logInfo(`See ${help.reactNativeProject} for help.`)
    errors++
    complete()
  }
  spinner.succeed(`Found a React Native project.`)
  spinner.succeed(`Found React Native version ${version}.`)

  // check Approov CLI

  spinner.start(`Checking for the Approov CLI...`)
  if (!await project.checkingIfApproovCLIActive()) {
    if (!project.isApproovCLIFound()) {
      spinner.fail('The Approov CLI is not installed or not in the current PATH.')
    } else {
      spinner.fail('The Approov CLI is not active.')
    }
    cli.logInfo(`See ${help.approovCLI} for help.`)
    errors++
  } else {
    spinner.succeed(`Found a working Approov CLI.`)
    const apiDomains = await project.findingProtectedAPIDomains()
    if (apiDomains.length <= 0) {
      spinner.warning('No protected API Domains found')
      warnings++
    } else {
      spinner.info(`Approov is currently protecting these API domains:`)
      apiDomains.forEach(domain => cli.logInfo(chalk.green(`  ${domain}`)))
    }
    cli.logInfo(`To add or remove API domains, see ${help.approovAPIDomains}.`)
  }

  // check Approov package

  spinner.start(`Checking if \'@approov/react-native-approov\` package is installed...`)
  if (!project.isApproovPackageInstalled()) {
    spinner.info('The \'@approov/react-native-approov\` package is not installed')
  } else {
    spinner.succeed('The \'@approov/react-native-approov\` package is installed')
  }

  // check Android project

  spinner.start(`Checking for Android project...`)
  if (!project.isAndroidProject()) {
    spinner.warn('No Android project found.')
    cli.logInfo('Skipping additional Android checks.')
    cli.logInfo(`See ${help.androidProject} for help.`)
    warnings++
  } else {
    spinner.succeed(`Found Android project.`)

    spinner.start(`Checking for Android minimum SDK...`)
    const minSDK = await project.findingAndroidMinSDK()
    if (!minSDK) {
      spinner.fail(`Found no Android minimum SDK; >= ${project.specs.andrdoidMinSDK} required.`)
      cli.logInfo(`See ${help.androidProject} for help.`)
      errors++
    } else if (!project.isAndroidMinSDKSupported(minSDK)) {
      spinner.fail(`Found Android minimum SDK ${minSDK}; >= ${project.specs.androidMinSDK} required.`)
      cli.logInfo(`See ${help.androidProject} for help.`)
      errors++
    } else {
      spinner.succeed(`Found Android minimum SDK ${minSDK}.`)
    }

    spinner.start('Checking for Android network permissions...')
    const permissions = await project.findingAndroidNetworkPermissions()
    if (!permissions.includes('android.permission.INTERNET')) {
      spinner.fail('Missing required \'android.permission.INTERNET\' in Android manifest.')
      cli.logInfo(`See ${help.androidNetworkPermissions} for help.`)
      errors++
    } else {
      spinner.succeed('Found \'android.permission.INTERNET\' in Android manifest.')
    }
    if (!permissions.includes('android.permission.INTERNET')) {
      spinner.fail('Missing required \'android.permission.ACCESS_NETWORK_STATE\' in Android manifest.')
      cli.logInfo(`See ${help.androidNetworkPermissions} for help.`)
      errors++
    } else {
      spinner.succeed('Found \'android.permission.ACCESS_NETWORK_STATE\' in Android manifest.')
    }

    if (project.isApproovPackageInstalled()) {
      spinner.start('Checking for Android approov components...')
      if (!project.hasAndroidApproovSDK()) {
        spinner.fail('Missing Approov Android SDK.')
        cli.logInfo(`See ${help.androidApproov} for help.`)
        errors++
      } else {
        spinner.succeed('Found Approov Android SDK.')
      }
      spinner.start('Checking for Android approov components...')
      if (!project.hasAndroidApproovConfig()) {
        spinner.fail('Missing Approov Android config file.')
        cli.logInfo(`See ${help.androidApproov} for help.`)
        errors++
      } else {
        spinner.succeed('Found Approov Android config file.')
      }
      spinner.start('Checking for Android approov components...')
      if (!project.hasAndroidApproovProps()) {
        spinner.fail('Missing Approov Android properties file.')
        cli.logInfo(`See ${help.androidApproov} for help.`)
        errors++
      } else {
        spinner.succeed('Found Approov Android properties file.')
      }
    }
  }

  // check iOS Project

  spinner.start(`Checking for iOS project...`)
  if (!project.isIosProject()) {
    spinner.warn('No iOS project found.')
    cli.logInfo('Skipping additional iOS checks.')
    cli.logInfo(`See ${help.iosProject} for help.`)
    warnings++
  } else {
    spinner.succeed(`Found iOS project.`)

    spinner.start(`Checking for iOS deployment target...`)
    const target = await project.findingIosDeploymentTarget()
    if (!target) {
      spinner.fail(`Found no iOS deployment target; >= ${project.specs.iosMinDeploymentTarget} required.`)
      cli.logInfo(`See ${help.iosProject} for help.`)
      errors++
    } else if (!project.isIosDeploymentTargetSupported(target)) {
      spinner.fail(`Found iOS deployment target ${target}; >= ${project.specs.iosMinDeploymentTarget} required.`)
      cli.logInfo(`See ${help.iosProject} for help.`)
      errors++
    } else {
      spinner.succeed(`Found iOS deployment target ${target}.`)
    }

    if (project.isApproovPackageInstalled()) {
      spinner.start('Checking for iOS Approov components...')
      if (!project.hasIosApproovSDK()) {
        spinner.fail('Missing iOS Approov SDK.')
        cli.logInfo(`See ${help.iosApproov} for help.`)
        errors++
      } else {
        spinner.succeed('Found iOS Approov SDK.')
      }
      spinner.start('Checking for iOS Approov components...')
      if (!project.hasIosApproovConfig()) {
        spinner.fail('Missing iOS Approov config file.')
        cli.logInfo(`See ${help.iosApproov} for help.`)
        errors++
      } else {
        spinner.succeed('Found iOS Approov config file.')
      }
      spinner.start('Checking for iOS Approov components...')
      if (!project.hasIosApproovProps()) {
        spinner.fail('Missing iOS Approov properties file.')
        cli.logInfo(`See ${help.iosApproov} for help.`)
        errors++
      } else {
        spinner.succeed('Found iOS Approov properties file.')
      }
    }
  }

  // complete

  complete()
})

module.exports = command
