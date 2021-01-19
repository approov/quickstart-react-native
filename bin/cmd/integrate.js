const path = require('path')
const { Command } = require('commander')
const prompts = require('prompts')
const chalk = require('chalk')
const ora = require('ora')
const cli = require('../util/cli')
const fsx = require('../util/fsx')
const rna = require('../util/rna')
const shell = require('../util/shell')
const tmp = require('tmp-promise')

const command = (new Command())

.name('integrate')
.description('Integrate Approov into the current app')

.option('--api <apis>', 'list of api domains to be protected', '')
.option('--token.name <name>', 'name of Approov token field', 'Approov-Token')
.option('--token.prefix <string>', 'prefix prepended to Approov token string', '')
.option('--binding.name <name>', 'name of binding field', '')
.option('--binding.prefix <string>', 'prefix removed from binding string', 'Bearer')
.option('--no-prompt', 'do not prompt for user input', false)
.option('--no-sync', 'do not synchronize integration files into the app', false)
.option('--save <dir>', 'save Approov integration files into this directory', '')

.action(async (opts) => {

  const sync = opts.sync
  const save = !!opts.save

  // if no save and no sync error

  if (!sync && !save) {
    cli.exitError('Nothing to do; neither sync nor save requested.')
  }

  // check for approov cli and defined management token

  if (rna.isApproovAccessible()) {
    cli.logSuccess('Found Approov CLI.')
  } else {
    cli.exitError('The Approov CLI is not installed or not in the current PATH.')
  }

  if (!rna.getApproovManagementToken()) {
    cli.exitError('The APPROOV_MANAGEMENT_TOKEN environmental variable is not set.')
  }

  let spinner = ora(`Verifying Approov management token...`).start()
  try {
    const { stdout, stderr } = await shell.execAsync('approov whoami')
    spinner.succeed(`Verified Approov management token.`)
  } catch (err) {
    spinner.fail('Failed to verify Approov management token.')
    cli.exitError()
  }

  // if sync, check for react native project and install approov package if needed

  if (sync) {
    if (!rna.isReactNativePackage('.')) {
      cli.exitError(`Current directory is not a react native project.`)
    }
    if (rna.isApproovPackageInstalled()) {
      cli.logSuccess(`Found @approov/react-native-approov package`)
    } else {
      cli.logInfo(`Installing @approov/react-native-approov package...`)
      try {
        await shell.execAsync('yarn add @approov/react-native-approov', {silent:false})
        spinner.succeed(`Installed @approov/react-native-approov package`)
      } catch (err) {
        cli.exitError(`Failed to install @approov/react-native-approov package`)
      }
      cli.logInfo(`Installing @approov/react-native-approov package iOS pod dependencies...`)
      try {
        shell.cd('ios')
        await shell.execAsync('pod install', {silent:false})
        spinner.succeed(`Installed @approov/react-native-approov package iOS pod dependencies`)
      } catch (err) {
        cli.exitError(`Failed to install @approov/react-native-approov package iOS pod dependencies`)
      }
    }
  }

  // set api domains

  const extractDomains = (str) => {
    if (!str) return []
    str = str.trim()
    if (!str) return []

    const lines = str.split(/\r?\n/)
    if (lines.length <= 1) return []
    lines.shift()

    return lines
  }

  const cleanDomains = domains => {
    return domains.filter(str => /\S/.test(str)).map(str => str.trim())
  }

  let currentDomains =[]
  spinner = ora(`Fetching current Approov-protected API domains...`).start()
  try {
    const { stdout } = await shell.execAsync('approov api -list')
    currentDomains = cleanDomains(extractDomains(stdout))
    spinner.succeed(`Fetched current Approov-protected API domains`)
  } catch (err) {
    spinner.fail('Failed to fetch current Approov-protected API domains')
    cli.exitError()
  }

  let apiDomains = []
  if (opts.api && opts.api.trim()) {
    apiDomains = cleanDomains(opts.api.split(/\s*,\s*/))
  } else {
    apiDomains = currentDomains
  }

  // set other values

  let tokenName = opts['token.name']
  let tokenPrefix = opts['token.prefix']
  let bindingName = opts['binding.name']
  let bindingPrefix = opts['binding.prefix']
  let saveDir = opts['save']

  const onPromptsCancel = (prompt, answers) => {
    cli.exitError('Command aborted.')
  }

  if (opts.prompt) {

    // apis

    let response = await prompts([
      {
        type: 'list',
        name: 'apiDomains',
        message: 'Specify comma-separated list of API domains to protect',
        initial: apiDomains.join(', '),
        separator: ','
      },
    ], { onCancel: onPromptsCancel })
    apiDomains = response.apiDomains

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

    // token prefix 

    response = await prompts([  
      {
        type: 'text',
        name: 'bindingPrefix',
        format: input => input.trim(),
        message: 'Specify prefix to remove from the binding data string, if any',
        initial: bindingPrefix,
      }
    ], { onCancel: onPromptsCancel })
    bindingPrefix = response.bindingPrefix
  }

  // add new api domains

  const newDomains = apiDomains.filter( domain => !currentDomains.includes(domain))

  if (newDomains.length > 0) {
    cli.logError(`Currently, these new domains cannot be added programmatically\n    ${newDomains.join('\n    ')}`)
    cli.logError(`Please add these API domains manually using the Approov CLI tool and then rerun integration.`)
    cli.exitError()
  }

  // create tmp directory

  let tmpDirObj
  try {
    tmpDirObj = await tmp.dir()
  } catch (err) {
    cli.exitError("Unable to create a temporary directory.")
  }
  const tmpDir = tmpDirObj.path

  // fetch config

  spinner = ora(`Fetching current Approov config string`).start()
  try {
    const { stdout } = await shell.execAsync(`approov sdk -getConfig ${path.join(tmpDir, 'approov.config')}`)
    spinner.succeed(`Fetched current Approov config string`)
  } catch (err) {
    spinner.fail('Failed to fetch current Approov config string')
    cli.exitError()
  }

  // create props file

  const fsp = require('fs').promises

  spinner = ora(`Creating Approov props file`).start()
  const propsStr = `# Approov props

token.name=${tokenName}
token.prefix=${tokenPrefix}
binding.name=${bindingName}
binding.prefix=${bindingPrefix}
`
  try {
    await fsp.writeFile(path.join(tmpDir, 'approov.props'), propsStr)
    spinner.succeed(`Created Approov props file`)
  } catch (err) {
    spinner.fail('Failed to create Approov props file')
    cli.exitError()
  }

  // fetch android sdk lib

  spinner = ora(`Fetching Approov Android SDK library`).start()
  try {
    const { stdout } = await shell.execAsync(`approov sdk -getLibrary ${path.join(tmpDir, 'approov.aar')}`)
    spinner.succeed(`Fetched current Approov Android SDK library`)
  } catch (err) {
    spinner.fail('Failed to fetch current Approov Android SDK library')
    cli.exitError()
  }

  // sync files?

  if (sync) {
    const syncDir = tmpDir
    
    // make android assets dir
  
    const assetsDir = path.normalize('./android/app/src/main/assets')
    shell.mkdir('-p', assetsDir)
    
    // copy android config
  
    const cfgSrc = path.join(syncDir, 'approov.config')
    if (fsx.isFile(cfgSrc)) {
      if (fsx.isDirectory(assetsDir) && fsx.isWritable(assetsDir)) {
        const spinner = ora(chalk.green(`Syncing Approov config string 'approov.config'...`)).start()
        try {
          const cfgDst = path.join(assetsDir, 'approov.config')
          await fsx.copy(cfgSrc, cfgDst, { overwrite:true })
          spinner.succeed(`Synced Approov config string '${cfgDst}'`)
        } catch (err) {
          spinner.fail(chalk.red(`Failed to sync Approov config string '${cfgDst}'`))
        }
      } else {
        cli.exitError(`Android assets directory '${assetsDir}' not found or not writable.`)
      }
    } else {
      cli.logInfo(`Approov config string 'approov.config' not found in source dir '${srcDir}'. Skipping.`)
    }
    
    // copy android props
  
    const propsSrc = path.join(syncDir, 'approov.props')
    if (fsx.isFile(propsSrc)) {
      if (fsx.isDirectory(assetsDir) && fsx.isWritable(assetsDir)) {
        const spinner = ora(chalk.green(`Syncing Approov props file 'approov.props'...`)).start()
        try {
          const propsDst = path.join(assetsDir, 'approov.props')
          await fsx.copy(propsSrc, propsDst, { overwrite:true })
          spinner.succeed(`Synced Approov props file '${propsDst}'`)
        } catch (err) {
          spinner.fail(chalk.red(`Failed to sync Approov props file '${propsDst}'`))
        }
      } else {
        cli.exitError(`Android assets directory '${assetsDir}' not found or not writable.`)
      }
    } else {
      cli.logInfo(`Approov props file 'approov.props' not found in source dir '${srcDir}'. Skipping.`)
    }

    // copy android props

    const aarSrc = path.join(syncDir, 'approov.aar')
    const aarDstDir = ('./node_modules/@approov/react-native-approov/android/libs')
    if (fsx.isFile(aarSrc)) {
      if (fsx.isDirectory(aarDstDir) && fsx.isWritable(aarDstDir)) {
        const spinner = ora(chalk.green(`Syncing Approov SDK library 'approov.aar'...`)).start()
        try {
          const aarDst = path.join(aarDstDir, 'approov.aar')
          await fsx.copy(aarSrc, aarDst, { overwrite:true })
          spinner.succeed(`Synced Approov SDK library '${aarDst}'`)
        } catch (err) {
          spinner.fail(chalk.red(`Failed to sync Approov SDK library '${aarDst}'`))
        }
      } else {
        cli.exitError(`Android library directory '${aarDstDir}' not found or not writable.`)
      }
    } else {
      cli.logInfo(`Approov SDK library 'approov.aar' not found in source dir '${srcDir}'. Skipping.`)
    }
  }
  
  // if save, copy each file to save dir

  if (save) {
    cli.logWarning('--save <dir> option not yet implemented.')
  }

  // delete tmp dir
  
    // TODO: be nice and clean up teh tmp dir
  
  cli.logSuccess(`Integration completed successfully.`)
})

module.exports = command