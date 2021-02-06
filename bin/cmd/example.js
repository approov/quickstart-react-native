const { Command } = require('commander')
const cli = require('../util/cli')

const command = (new Command())

.name('example')
.description('Copy a quickstart example app into a new directory')
.arguments('[app] [dir]', {
  app: 'app to copy (default: shapes-fetch)',
  dir: 'directory to copy app into (default: .)'
})

.option('--no-prompt', 'do not prompt for user input')

.action(async (app, dir, opts) => {
  cli.exitError(`Command not implemented`)
})

module.exports = command
