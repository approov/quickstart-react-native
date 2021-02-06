const { Command } = require('commander')
const cli = require('../util/cli')
const checks = require('../util/checks')

const command = (new Command())

.name('check')
.description('Check Approov integration in the current app')

.action(async () => {
  let ok = true;
  ok &= await checks.checkApproovInstallation()
  ok &= await checks.checkReactNativeProject(process.cwd())
  ok &= await checks.checkAndroidProject(process.cwd())
  ok &= await checks.checkAndroidNetworkPermissions(process.cwd())
  ok &= await checks.checkIosProject(process.cwd())

  if (ok) {
    cli.logSuccess("All checks completed successfully")
  } else {
    cli.exitError("Check found potential issues; see https://www.npmjs.com/package/@approov/react-native-approov for assistance")
  }
})

module.exports = command
