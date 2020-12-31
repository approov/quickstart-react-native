const { Command } = require('commander')
const path = require('path')
const chalk = require('chalk')
const ora = require('ora')
const cli = require('../util/cli')
const fsx = require('../util/fsx')
const rna = require('../util/rna')
const shell = require('../util/shell')

const command = (new Command())

.name('sync')
.description('Synchronize app using saved Approov integration files')

.arguments('[srcDir]', {
  'srcDir': 'source integration directory (default: .)'
})

.action(async (srcDir) => {
  srcDir = srcDir || '.'
  const syncDir = path.normalize(srcDir)
  console.log(process.cwd())

  // check if is package and react-native-approov package is installed

  if (!rna.isReactNativePackage('.')) {
    cli.exitError(`Current directory is not a react native project.`)
  } else if (!rna.isApproovPackageInstalled()) {
    cli.exitError(`@approov/react-native-approov package is not installed.`)
  }

  // check if source dir exists

  if (fsx.isDirectory(syncDir) && fsx.isReadable(syncDir)) {
    cli.logSuccess(`Found source directory '${srcDir}'`)
  } else {
    cli.exitError(`Source directory '${srcDir}' not found or not readable.`)
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

  cli.logSuccess(`Sync completed successfully.`)
})

module.exports = command
