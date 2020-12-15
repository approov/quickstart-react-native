const { Command } = require('commander')

const command = (new Command())

.name('sync')
.description('synchronize Approov app integration')

.action((opts) => {
  const apis = opts.apis || ''

  console.log('')
  console.log(`sync command here`)
  console.log('')
})

module.exports = command
