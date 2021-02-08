const { Command } = require('commander')
const path = require('path')
const prompts = require('prompts')
const chalk = require('chalk')
const { cli, fsx, shell } = require('../util')

const command = (new Command())

.name('example')
.description('Copy a quickstart example app into a new directory')

.arguments('[app] [dir]', {
  app: 'app to copy (default: shapes-fetch)',
  dir: 'directory to copy app into (default: .)'
})
.option('--no-prompt', 'do not prompt for user input')

.action(async (app, dir, opts) => {

  const defaults = { 
    appName: 'shapes-fetch', 
    dstDir: '.',
    srcDir: path.normalize(path.join(__dirname, '../../examples'))
  }

  let appName = app || defaults.appName
  let dstDir = dir || defaults.dstDir

  const validateDst = (dir) => {
    const dstDir =  path.normalize(dir || defaults.dstDir)
    const dst = path.join(dstDir, appName)

    if (fsx.isDirectory(dstDir)) {
      if (fsx.isWritable(dstDir)) {
        if (fsx.isAccessible(dst)) {
          return`Destination ${dst} already exists.`
        } 
      } else {
        return`Destination ${dstDir} not writable.`
      }
    } else {
      return`Destination ${dstDir} not a directory.`
    }

    return true
  }

  const onPromptsCancel = (prompt, answers) => {
    cli.exitError('Command aborted.')
  }

  // build list of examples

  const srcDir = defaults.srcDir
  let examples = []
  fsx.readdirSync(srcDir).forEach(file => {
    try {
      const description = require(path.join(srcDir, file, 'package.json')).description || ''
      const disabled = description.match(/disabled/i)
      examples.push({ title: file, description: description, value: file, disabled: disabled })
    } catch { /* ignore files & non-package dirs */ }
  })


  // if prompt, ask for inputs

  if (opts.prompt) {

    // find initial index

    let examplesIndex = examples.findIndex(ex => ex.title === appName)
    if (examplesIndex < 0) {
      examplesIndex = examples.findIndex(ex => ex.title === defaults.appName)
      if (examplesIndex < 0) {
        examplesIndex = 0
      }
    }

    // gather responses

    let response = await prompts([
      {
        type: 'select',
        name: 'appName',
        message: 'Select example app to copy',
        choices: examples,
        initial: examplesIndex,
      },
    ], { onCancel: onPromptsCancel })
    appName = response.appName

    response = await prompts([  
      {
        type: 'text',
        name: 'dstDir',
        format: input => input.trim(),
        message: 'Specify destination path',
        initial: dstDir,
        validate: dir => validateDst(dir)
      }
    ], { onCancel: onPromptsCancel })
    dstDir = response.dstDir || defaults.dstDir
  }

  // check if source is valid

  if (!examples.find(ex => ex.title === appName)) {
    cli.exitError(`app ${appName} not found`)
  }

  const src = path.join(srcDir, appName)

  // check if destination is valid

  const dstStatus = validateDst(dstDir)
  if (dstStatus !== true) {
    cli.exitError(dstStatus)
  }

  const dst = path.join(dstDir, appName)

  // copy app

  const spinner = cli.spinner().start(chalk.green(`Creating ${appName} example...`))
  try {
    await fsx.copy(src, dst, { overwrite:false, errorOnExist:true})
    spinner.succeed(`Created ${appName} example.`)
  } catch (err) {
    spinner.fail(chalk.red(`Failed to create ${appName} example.`))
  }

  // install app dependencies

  cli.logInfo(`Installing ${appName} npm dependencies...`)
  try {
    shell.cd(dst)
    await shell.execAsync('yarn install', {silent:false})
    spinner.succeed(`Installed ${appName} npm dependencies`)
  } catch (err) {
    cli.exitError(`Failed to install ${appName} npm dependencies`)
  }

  // install ios pod dependencies

  cli.logInfo(`Installing ${appName} iOS pod dependencies...`)
  try {
    shell.cd('ios')
    await shell.execAsync('pod install', {silent:false})
    spinner.succeed(`Installed ${appName} iOS pod dependencies`)
  } catch (err) {
    cli.exitError(`Failed to install ${appName} iOS pod dependencies`)
  }

})

module.exports = command
