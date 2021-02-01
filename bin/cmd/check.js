const { Command } = require('commander')
const cli = require('../util/cli')
const action = require('../util/action')

const command = (new Command())

.name('check')
.description('Check Approov integration in the current app')

.action(async () => {
  let ok = true;
  ok &= await action.checkApproovInstallation()
  ok &= await action.checkReactNativeProject(process.cwd())
  ok &= await action.checkAndroidProject(process.cwd())
  ok &= await action.checkIosProject(process.cwd())

  if (ok) {
    cli.logSuccess("All checks completed successfully")
  } else {
    cli.exitError("Check found potential issues; see https://www.npmjs.com/package/@approov/react-native-approov for assistance")
  }
})

module.exports = command
