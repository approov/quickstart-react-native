const { Command } = require('commander')

const command = (new Command())

.name('integrate')
.description('integrate Approov into the current app')

.option('--apis', 'list of api domains to be protected')

.action((opts) => {
  const apis = opts.apis || ''

  console.log('')
  console.log(`integrate command here`)
  console.log(`  apis:  ${opts.apis}`)
  console.log(`  path: ${appPath}`)
  console.log('')
})

module.exports = command
// .command('sync', 'synchronizes the current app integration')
