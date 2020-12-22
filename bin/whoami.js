const { Command } = require('commander')
const ora = require('ora')
const util = require('./util')

const extractInfo = text => {
  if (!text) return {}

  const info = {}
  text.split('\n').forEach(line => {
    const split = /^([^:]+):(.*)$/.exec(line)
    if (split) {
      const name = (split[1] || '').trim()
      const value = (split[2] || '').trim()
      if (name) {
        info[name] = value
      }
    }
  })

  info.format = 
    `    account: ${('account' in info) ? info.account.split(/\s+/)[0] : 'not reported'}` +
    `\n    userName: ${('userName' in info) ? info.userName : 'not reported'}` +
    `\n    expiry: ${('expiry' in info) ? info.expiry : 'not reported'}`

  return info
}

const command = (new Command())

.name('whoami')
.description('Verify Approov account')

.action(async () => {
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

  const spinner = ora(`Verifying Approov account...`).start()
  try {
    const { stdout, stderr } = await util.execAsync('approov whoami')
    const info = extractInfo(stdout)
    spinner.succeed(`Verified Approov management token:\n${info.format}`)
  } catch (err) {
    util.exitError('Failed to verify Approov management token.')
  }
})

module.exports = command
