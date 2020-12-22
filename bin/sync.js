const { Command } = require('commander')
const util = require('./util')

const command = (new Command())

.name('sync')
.description('Synchronize app using saved Approov integration files')

.arguments('[dir]', {
  'dir': 'integration directory (default: .)'
})

.action((dir) => {
  const syncDir = dir || '.'

  util.logError(`Check command not available`)
  util.logInfo(`  dir: ${syncDir}`)
})

module.exports = command
