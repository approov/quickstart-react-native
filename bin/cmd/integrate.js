const { Command } = require('commander')
const Project = require('../project')
const { cli, fsx, shell } = require('../util')

const path = require('path')
const prompts = require('prompts')
const chalk = require('chalk')

const command = (new Command())


.name('integrate')
.description('Integrate Approov into the current app')

.option('--token.name <name>', 'name of Approov token field', 'Approov-Token')
.option('--token.prefix <string>', 'prefix prepended to Approov token string', '')
.option('--binding.name <name>', 'name of binding field', '')
.option('--init.prefetch', 'start token fetch at app launch', false)
.option('--no-prompt', 'do not prompt for user input', false)
.option('--no-sync', 'do not synchronize integration files into the app', false)
.option('--save <dir>', 'save Approov integration files into this directory', '')
.option('--approov <version>', 'Approov version', 'latest')

.action(async (opts) => {
  let errors = 0
  let warnings = 0
  const complete = () => {
    cli.logNote('')
    if (errors == 0 && warnings == 0) {
      cli.logSuccess("Integration completed successfully")
    } else if (errors == 0) {
      cli.logWarning(`Found${errors} error${errors!=1?'s':''}, ${warnings} warning${warnings!=1?'s':''}`)
    } else {
      cli.exitError(`Found ${errors} error${errors!=1?'s':''}, ${warnings} warning${warnings!=1?'s':''}`)
    }
  }

  // check save and sync

  const sync = opts.sync
  const save = !!opts.save
  if (!sync && !save) {
    cli.logWarning('Nothing to do; neither sync nor save requested.')
    warnings++
    complete()
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

  // get/modify values

  let tokenName = opts['token.name']
  let tokenPrefix = opts['token.prefix']
  let bindingName = opts['binding.name']
  let usePrefetch = opts['init.prefetch']
  let saveDir = opts['save']

  const onPromptsCancel = (prompt, answers) => {
    cli.exitError('Command aborted.')
  }

  if (opts.prompt) {

    // token name

    response = await prompts([  
      {
        type: 'text',
        name: 'tokenName',
        format: input => input.trim(),
        message: 'Specify Approov token header name',
        initial: tokenName,
        validate: input => input.trim().length > 0 && !/\s/.test(input.trim())
      }
    ], { onCancel: onPromptsCancel })
    tokenName = response.tokenName

    // token prefix 

    response = await prompts([  
      {
        type: 'text',
        name: 'tokenPrefix',
        format: input => input.trim(),
        message: 'Specify prefix to add to the Approov token string, if any',
        initial: tokenPrefix,
      }
    ], { onCancel: onPromptsCancel })
    tokenPrefix = response.tokenPrefix

    // binding name

    response = await prompts([  
      {
        type: 'text',
        name: 'bindingName',
        format: input => input.trim(),
        message: 'Specify binding header data name, if any',
        initial: bindingName,
        validate: input => !/\s/.test(input.trim())
      }
    ], { onCancel: onPromptsCancel })
    bindingName = response.bindingName

    // use prefetch

    response = await prompts([  
      {
        type: 'toggle',
        name: 'usePrefetch',
        message: 'Start token prefetch during app launch?',
        initial: usePrefetch,
        active: 'yes',
        inactive: 'no'
      }
    ], { onCancel: onPromptsCancel })
    usePrefetch = response.usePrefetch
  }

  const props = {
    tokenName,
    tokenPrefix,
    bindingName,
    usePrefetch,
  }

  console.log(`props: ${props}`)

  // check and install Approov package

  spinner.start(`Checking if \'@approov/react-native-approov\` package is installed...`)
  if (!project.isApproovPackageInstalled()) {
    spinner.start(`Installing the \'@approov/react-native-approov\` package...`)
    if (!await project.installingApproovPackage()) {
      spinner.fail(`Failed to install \'@approov/react-native-approov\' package`)
      errors++
      complete()
    }
    spinner.succeed(`Installed @approov/react-native-approov package`)
  } else {
    spinner.succeed('The \'@approov/react-native-approov\` package is already installed')
  }

  // install android files

  if (project.isAndroidProject()) {
    spinner.start(`Installing Android Approov SDK library...`).start()
    if (!await project.writingAndroidApproovSDK()) {
      spinner.fail('Failed to install Android Approov SDK library.')
      cli.logInfo(`See ${help.contactSupport} for help.`)
      errors++
      complete()
    }
    spinner.succeed(`Installed Android Approov SDK library.`)

    spinner.start(`Installing Android Approov config file...`).start()
    if (!await project.writingAndroidApproovConfig()) {
      spinner.fail('Failed to install Android Approov config file.')
      cli.logInfo(`See ${help.contactSupport} for help.`)
      errors++
      complete()
    }
    spinner.succeed(`Installed Android Approov config file.`)

    spinner.start(`Installing Android Approov props file...`).start()
    if (!await project.writingAndroidApproovProps(props)) {
      spinner.fail('Failed to install Android Approov props file.')
      cli.logInfo(`See ${help.contactSupport} for help.`)
      errors++
      complete()
    }
    spinner.succeed(`Installed Android Approov props file.`)
  }

  // install ios files & update pods

  if (project.isIosProject()) {
    spinner.start(`Installing iOS Approov SDK library...`).start()
    if (!await project.writingIosApproovSDK()) {
      spinner.fail('Failed to install iOS Approov SDK library.')
      cli.logInfo(`See ${help.contactSupport} for help.`)
      errors++
      complete()
    }
    spinner.succeed(`Installed iOS Approov SDK library.`)

    spinner.start(`Installing iOS Approov config file...`).start()
    if (!await project.writingIosApproovConfig()) {
      spinner.fail('Failed to install iOS Approov config file.')
      cli.logInfo(`See ${help.contactSupport} for help.`)
      errors++
      complete()
    }
    spinner.succeed(`Installed iOS Approov config file.`)

    spinner.start(`Installing iOS Approov props file...`).start()
    if (!await project.writingIosApproovProps(props)) {
      spinner.fail('Failed to install iOS Approov props file.')
      cli.logInfo(`See ${help.contactSupport} for help.`)
      errors++
      complete()
    }
    spinner.succeed(`Installed iOS Approov props file.`)

    spinner.start(`Updating iOS pod dependencies...`)
    if (!await project.updatingIosPods()) {
      spinner.fail('Failed to update iOS pods.')
      cli.logInfo(`See ${help.contactSupport} for help.`)
      errors++
      complete()
    }
    spinner.succeed(`Updated iOS pods.`)
  }

  // complete

  complete()
})
  
module.exports = command
