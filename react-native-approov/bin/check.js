const { Command } = require('commander')

const command = (new Command())

.name('check')
.description('check Approov integration in the current app')

.action((opts) => {

  console.log('');
  console.log(`check command here`)
  console.log('');
})

module.exports = command
