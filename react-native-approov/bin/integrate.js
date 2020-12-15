const { Command } = require('commander')

const command = (new Command())

.name('integrate')
.description('integrate Approov into the current app')

.option('--apis <apis>', 'list of api domains to be protected', '')
.option('--token.name <name>', 'name of Approov token field', 'Approov-Token')
.option('--token.prefix <string>', 'prefix prepended to Approov token string', '')
.option('--binding.name <name>', 'name of binding field', '')
.option('--binding.prefix <string>', 'prefix removed from binding string', '')
.option('--no-prompt', 'do not prompt for user input')
.option('--no-sync', 'do not synchronize integration files into the app')
.option('--save <dir>', 'save Approov integration files into this directory', '.')

.action((opts) => {
  console.log('')
  console.log(`integrate command here`)
  console.log(`  apis: ${opts.apis}`)
  console.log(`  tokenName: ${opts['token.name']}`)
  console.log(`  tokenPrefix: ${opts['token.prefix']}`)
  console.log(`  bindingName: ${opts['binding.name']}`)
  console.log(`  bindingPrefix: ${opts['binding.prefix']}`)
  console.log(`  prompt: ${!opts['no-prompt']}`)
  console.log(`  sync: ${!opts['no-sync']}`)
  console.log(`  saveDir: ${opts.save}`)
  console.log('')
})

module.exports = command
