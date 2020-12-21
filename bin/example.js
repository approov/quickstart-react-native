const path = require('path')
const fs = require('fs-extra')
const { Command } = require('commander')
const prompts = require('prompts')
const chalk = require('chalk')
const util = require('./util')
const ora = require('ora')

const command = (new Command())

.name('example')
.description('copy a quickstart example app into a new directory')

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

  console.log('')

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

    const response = await prompts([
      {
        type: 'select',
        name: 'appName',
        message: 'Select example app to copy',
        choices: examples,
        initial: examplesIndex,
      },
      {
        type: 'text',
        name: 'dstDir',
        format: input => input.trim(),
        message: 'Specify destination path',
        initial: dstDir,
      }
    ])

    appName = response.appName
    dstDir = response.dstDir
  }

  // check if source is valid

  if (!examples.find(ex => ex.title === appName)) {
    util.exitError(`app ${appName} not found`)
  }

  const src = path.join(srcDir, appName)

  // check if destination is valid


  dstDir = path.resolve(dstDir || '.')
  const dst = path.join(path.resolve(dstDir), appName)

  if (util.isDirectory(dstDir)) {
    if (util.isWritable(dstDir)) {
      if (util.isAccessible(dst)) {
        util.exitError(`destination ${dst} already exists`)
      } 
    } else {
      util.exitError(`destination ${dstDir} not writable`)
    }
  } else {
    util.exitError(`destination ${dstDir} not a directory`)
  }

  // copy app

  console.log(`...copying ${src} to ${dst}`)
  const spinner = ora(chalk.green(`Creating ${appName} example.`)).start()
  try {
    await fs.copy(src, dst, { overwrite:false, errorOnExist:true})
    spinner.succeed(`Example ${appName} created.`)
  } catch (err) {
    spinner.fail(chalk.red(`Failed to create ${appName}.`))
  }
})

module.exports = command
