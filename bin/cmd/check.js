const { Command } = require('commander')
const action = require('../util/action')

const command = (new Command())

.name('check')
.description('Check Approov integration in the current app')

.action(async () => {
  await action.checkApproovInstallation()
  await action.checkReactNativeProject(process.cwd())
  await action.checkAndroidProject(process.cwd())
  await action.checkIosProject(process.cwd())
})

module.exports = command
