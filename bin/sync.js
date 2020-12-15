const { Command } = require('commander')

const command = (new Command())

.name('sync')
.description('synchronize app using saved Approov integration files')

.arguments('[dir]', {
  'dir': 'integration directory (default: .)'
})

.action((dir, opts) => {
  const syncDir = dir || '.'

  console.log('')
  console.log(`sync command here`)
  console.log(`  dir: ${syncDir}`)
  console.log('')
})

module.exports = command
