const { Command } = require('commander')
const cli = require('../util/cli')

const command = (new Command())

.name('check')
.description('Check Approov integration in the current app')

.action(() => {
  cli.exitError(`Check command not yet available`)
})

module.exports = command
