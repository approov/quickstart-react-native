const { Command } = require('commander')

const command = (new Command())

.name('example')
.description('copy a quickstart example app into a new directory')

.arguments('<app> [path]', {
  app: 'app to copy',
  'path': 'directory path (current directory if not specified)'
})

.action((app, path, opts) => {
  const appPath = path || '.'

  console.log('');
  console.log(`example command here`)
  console.log(`  app:  ${app}`)
  console.log(`  path: ${appPath}`)
  console.log('');
})

module.exports = command
