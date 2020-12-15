const { Command } = require('commander')

const command = (new Command())

.name('examples')
.description('list available quickstart app examples')

.action((opts) => {

  console.log('');
  console.log(`examples command here`)
  console.log('');
})

module.exports = command
