const ora = require('ora')
const cli = require('../util/cli')
const shell = require('../util/shell')
const rna = require('../util/rna')

const regAndroid = (async (args, config, opts) => {
  // check for spurious args

  // check for approov cli and defined management token

  if (rna.isApproovAccessible()) {
    cli.logSuccess('Found Approov CLI.')
  } else {
    cli.exitError('The Approov CLI is not installed or not in the current PATH.')
  }

  if (rna.getApproovManagementToken()) {
    cli.logSuccess('Found Approov management token.')
  } else {
    cli.exitError('The APPROOV_MANAGEMENT_TOKEN environmental variable is not set.')
  }

  // check is react-native (has package.json with react-native package)?
  // check has ./android/app/build/outputs/apk/debug/app-debug.apk

  const cmd = `approov registration -add ./android/app/build/outputs/apk/debug/app-debug.apk -expireAfter ${opts.expireAfter}`

  const spinner = ora(`Registering debug app...`).start()
  try {
    const { stdout } = await shell.execAsync(cmd)
    if (stdout) {
      spinner.succeed(`Registered debug app for ${opts.expireAfter}:\n${cli.indent(stdout)}`)
    } else {
      spinner.succeed(`Registered debug app for ${opts.expireAfter}.`)
    }
  } catch ({ stdout, stderr }) {
    if (stderr) {
      spinner.fail(`Failed to register debug app.\n${cli.indent(stderr)}`)
    } else if (stdout) {
      spinner.fail(`Failed to register debug app.\n${cli.indent(stdout)}`)
    } else {
      spinner.fail(`Failed to register debug app.`)
    }
    cli.exitError()
  }
})

module.exports = {
  regAndroid,
}
