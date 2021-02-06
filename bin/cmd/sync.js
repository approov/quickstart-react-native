const { Command } = require('commander')
const cli = require('../util/cli')

const command = (new Command())

.name('sync')
.description('Synchronize app using saved Approov integration files')

.arguments('[srcDir]', {
  'srcDir': 'source integration directory (default: .)'
})

.action(async (opts) => {
  cli.exitError(`Command not implemented`)
})
  
module.exports = command
