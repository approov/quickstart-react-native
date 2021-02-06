const { Command } = require('commander')
const cli = require('../util/cli')

const command = (new Command())

.name('integrate')
.description('Integrate Approov into the current app')

.option('--token.name <name>', 'name of Approov token field', 'Approov-Token')
.option('--token.prefix <string>', 'prefix prepended to Approov token string', '')
.option('--binding.name <name>', 'name of binding field', '')
.option('--binding.prefix <string>', 'prefix removed from binding string', 'Bearer')
.option('--no-prompt', 'do not prompt for user input', false)
.option('--no-sync', 'do not synchronize integration files into the app', false)
.option('--save <dir>', 'save Approov integration files into this directory', '')

.action(async (opts) => {
  cli.exitError(`Command not implemented`)
})
  
module.exports = command
