const ora = require('ora')
const util = require('./util')

const regAndroid = (async (args, config, opts) => {
  // check for spurious args

  // check for approov cli and defined management token

  if (util.isApproovAccessible()) {
    util.logSuccess('Found Approov CLI.')
  } else {
    util.exitError('The Approov CLI is not installed or not in the current PATH.')
  }

  if (util.getApproovManagementToken()) {
    util.logSuccess('Found Approov management token.')
  } else {
    util.exitError('The APPROOV_MANAGEMENT_TOKEN environmental variable is not set.')
  }

  // check is react-native (has package.json with react-native package)?
  // check has ./android/app/build/outputs/apk/debug/app-debug.apk

  const cmd = `approov registration -add ./android/app/build/outputs/apk/debug/app-debug.apk -expireAfter ${opts.expireAfter}`

  const spinner = ora(`Registering debug app...`).start()
  try {
    const { stdout } = await util.execAsync(cmd)
    if (stdout) {
      spinner.succeed(`Registered debug app for ${opts.expireAfter}:\n${util.indent(stdout.trim())}`)
    } else {
      spinner.succeed(`Registered debug app for ${opts.expireAfter}.`)
    }
  } catch ({ stdout, stderr }) {
    if (stderr) {
      spinner.fail(`Failed to register debug app.\n${util.indent(stderr.trim())}`)
    } else if (stdout) {
      spinner.fail(`Failed to register debug app.\n${util.indent(stdout.trim())}`)
    } else {
      spinner.fail(`Failed to register debug app.`)
    }
    util.exitError()
  }
})

module.exports = {
  regAndroid,
}
