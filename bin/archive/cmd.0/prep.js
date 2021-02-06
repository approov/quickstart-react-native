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
const checks = require('../util/checks')
const command = (new Command())

.name('prep')
.description('Prepare Approov integration for the current app')

.option('--token.name <name>', 'name of Approov token field', 'Approov-Token')
.option('--token.prefix <string>', 'prefix prepended to Approov token string', '')
.option('--binding.name <name>', 'name of binding field', '')
.option('--init.prefetch', 'prefetch Approov token at application launch', false)
.option('--no-prompt', 'do not prompt for user input', false)
.option('--save <dir>', 'save Approov integration files into this directory', '')

.action(async (opts) => {
  cli.exitError('command not implemented.')
})

module.exports = command
