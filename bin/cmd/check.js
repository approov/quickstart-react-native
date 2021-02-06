const { Command } = require('commander')
const { cli } = require('../util')
const { approov, Checker } = require('../action')

const command = (new Command())

.name('check')
.description('Check Approov integration in the current app')

.option('--approov <version>', 'Approov version', 'latest')

.action(async () => {

  const checks = new Checker(process.cwd(), 'latest')

  await checks.checkAll()

  checks.summarize()
  if (checks.errors > 0) cli.exitError()
})

module.exports = command
