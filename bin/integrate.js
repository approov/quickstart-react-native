const { Command } = require('commander')
const util = require('./util')

const command = (new Command())

.name('integrate')
.description('Integrate Approov into the current app')

.option('--apis <apis>', 'list of api domains to be protected', '')
.option('--token.name <name>', 'name of Approov token field', 'Approov-Token')
.option('--token.prefix <string>', 'prefix prepended to Approov token string', '')
.option('--binding.name <name>', 'name of binding field', '')
.option('--binding.prefix <string>', 'prefix removed from binding string', '')
.option('--no-prompt', 'do not prompt for user input', false)
.option('--no-sync', 'do not synchronize integration files into the app', false)
.option('--save <dir>', 'save Approov integration files into this directory', '')

.action((opts) => {
  util.logError(`Integrate command not available.`)
  util.logInfo(`  apis: ${opts.apis}`)
  util.logInfo(`  tokenName: ${opts['token.name']}`)
  util.logInfo(`  tokenPrefix: ${opts['token.prefix']}`)
  util.logInfo(`  bindingName: ${opts['binding.name']}`)
  util.logInfo(`  bindingPrefix: ${opts['binding.prefix']}`)
  util.logInfo(`  prompt: ${!opts['no-prompt']}`)
  util.logInfo(`  sync: ${!opts['no-sync']}`)
  util.logInfo(`  saveDir: ${opts.save}`)
})

module.exports = command
