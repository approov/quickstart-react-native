const { Command } = require('commander')

const command = (new Command())

.name('whoami')
.description('identify Approov account')

.action(() => {
  console.log('')
  console.log(`whoami results here`)
  console.log('')
})

module.exports = command
