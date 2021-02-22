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
const { config, fsx, Log, Project, sh } = require('../project')
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
.option('--approov <version>', 'Approov version', config.approovDefaultVersion)

.action(async (opts) => {
  const log = new Log()

  let errors = 0
  let warnings = 0
  const complete = () => {
    log.note()
    if (errors == 0 && warnings == 0) {
      log.succeed("Integration completed successfully")
    } else if (errors == 0) {
      log.warn(`Found ${errors} error${errors!=1?'s':''}, ${warnings} warning${warnings!=1?'s':''}`)
    } else {
      log.exit(`Found ${errors} error${errors!=1?'s':''}, ${warnings} warning${warnings!=1?'s':''}`)
    }
  }

  // check save and sync

  const sync = opts.sync
  const save = !!opts.save
  if (!sync && !save) {
    log.warn('Nothing to do; neither sync nor save requested.')
    warnings++
    complete()
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

  // check and install Approov package

  log.spin(`Checking if \'@approov/react-native-approov\` package is installed...`)
  if (!project.approov.pkg.isInstalled) {
    log.note(`Installing the @approov/react-native-approov package...`)
    await project.installingApproovPkg()
    if (!project.approov.pkg.isInstalled) {
      log.fail(`Failed to install @approov/react-native-approov package`)
      log.help('contactSupport')
      errors++
      complete()
    }
    log.succeed(`Installed @approov/react-native-approov package`)
  } else {
    log.succeed('The @approov/react-native-approov package is already installed')
  }

  // install android files

  if (project.reactNative.hasAndroid) {
    log.note(`Installing Android Approov SDK library...`)
    await project.installingAndroidApproovSdk()
    if (!project.android.approov.hasSdk) {
      log.fail('Failed to install Android Approov SDK library.')
      log.help('contactSupport')
      errors++
      complete()
    }
    log.succeed(`Installed Android Approov SDK library.`)

    log.note(`Installing Android Approov config file...`)
    await project.installingAndroidApproovConfig()
    if (!project.android.approov.hasConfig) {
      log.fail('Failed to install Android Approov config file.')
      log.help('contactSupport')
      errors++
      complete()
    }
    log.succeed(`Installed Android Approov config file.`)

    log.spin(`Installing Android Approov props file...`)
    await project.installingAndroidApproovProps(props)
    if (!project.android.approov.hasProps) {
      log.fail('Failed to install Android Approov props file.')
      log.help('contactSupport')
      errors++
      complete()
    }
    log.succeed(`Installed Android Approov props file.`)
  }

  // install ios files

  if (project.reactNative.hasIos) {
    log.note(`Installing iOS Approov SDK library...`)
    await project.installingIosApproovSdk()
    if (!project.ios.approov.hasSdk) {
      log.fail('Failed to install iOS Approov SDK library.')
      log.help('contactSupport')
      errors++
      complete()
    }
    log.succeed(`Installed iOS Approov SDK library.`)

    log.note(`Installing iOS Approov config file...`)
    await project.installingIosApproovConfig()
    if (!project.ios.approov.hasConfig) {
      log.fail('Failed to install iOS Approov config file.')
      log.help('contactSupport')
      errors++
      complete()
    }
    log.succeed(`Installed iOS Approov config file.`)

    log.spin(`Installing iOS Approov props file...`)
    await project.installingIosApproovProps(props)
    if (!project.ios.approov.hasProps) {
      log.fail('Failed to install iOS Approov props file.')
      log.help('contactSupport')
      errors++
      complete()
    }
    log.succeed(`Installed iOS Approov props file.`)
  }

  if (sh.which('pod')) {
    log.note(`Updating iOS pods...`)
    await project.updatingIosPods()
    if (!project.ios.updatedPods) {
      log.fail('Failed to update iOS pods.')
      log.help('contactSupport')
      errors++
      complete()
    }
    log.succeed(`Updated iOS pods.`)
  } else {
    log.warn(`Skipping ${appName} iOS pod dependencies; pod installation not available.`)
    warnings++
  }

  // complete

  complete()
})
  
module.exports = command
