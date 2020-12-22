const path = require('path')
const fs = require('fs-extra')
const { Command } = require('commander')
const prompts = require('prompts')
const chalk = require('chalk')
const ora = require('ora')
const util = require('./util')

const command = (new Command())

.name('example')
.description('Copy a quickstart example app into a new directory')
.arguments('[app] [dir]', {
  app: 'app to copy (default: shapes-fetch)',
  dir: 'directory to copy app into (default: .)'
})

.option('--no-prompt', 'do not prompt for user input')

.action(async (app, dir, cmd) => {
  const defaults = { 
    appName: 'shapes-fetch', 
    dstDir: '.',
    srcDir: path.normalize(path.join(__dirname, '../examples'))
  }

  let appName = app || defaults.appName
  let dstDir = dir || defaults.dstDir

  const validateDst = (dir) => {
    const dstDir =  path.normalize(dir || defaults.dstDir)
    const dst = path.join(dstDir, appName)

    if (util.isDirectory(dstDir)) {
      if (util.isWritable(dstDir)) {
        if (util.isAccessible(dst)) {
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
    util.exitError('Command aborted.')
  }

  // build list of examples

  const srcDir = defaults.srcDir
  let examples = []
  fs.readdirSync(srcDir).forEach(file => {
    try {
      const description = require(path.join(srcDir, file, 'package.json')).description || ''
      examples.push({ title: file, description: description, value: file })
    } catch { /* ignore files & non-package dirs */ }
  })

  // if prompt, ask for inputs

  if (cmd.prompt) {

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
    util.exitError(`app ${appName} not found`)
  }

  const src = path.join(srcDir, appName)

  // check if destination is valid

  const dstStatus = validateDst(dstDir)
  if (dstStatus !== true) {
    util.exitError(dstStatus)
  }

  const dst = path.join(dstDir, appName)

  // copy app

  const spinner = ora(chalk.green(`Creating ${appName} example...`)).start()
  try {
    await fs.copy(src, dst, { overwrite:false, errorOnExist:true})
    spinner.succeed(`Created ${appName} example.`)
  } catch (err) {
    spinner.fail(chalk.red(`Failed to create ${appName} example.`))
  }
})

module.exports = command
