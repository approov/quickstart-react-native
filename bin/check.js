const { Command } = require('commander')
const util = require('./util')

const command = (new Command())

.name('check')
.description('Check Approov integration in the current app')

.action(() => {
  util.logError(`Check command not available`)
})

module.exports = command
