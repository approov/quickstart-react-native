const { Command } = require('commander')

const command = (new Command())

.name('example')
.description('copy a quickstart example app into a new directory')

.arguments('<app>', {
  app: 'app to copy'
})
.option('-p, --path', 'directory path (defaults to current directory)')

.action((app, opts) => {
  const appPath = opts.path || '.'
  console.log('');
  console.log(`example command here`)
  console.log(`  app:  ${app}`)
  console.log(`  path: ${appPath}`)
  console.log('');
})

module.exports = command
