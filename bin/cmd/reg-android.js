const { Command } = require('commander')
const { config, Log, Project } = require('../project')

const command = (new Command())

.name('reg-android')
.description('Register Android apps with Approov')

.option('--expireAfter <duration>', 'expire registration after duration','1h')

.action(async (opts) => {
  const log = new Log()

  let errors = 0
  let warnings = 0
  const complete = () => {
    log.note()
    if (errors == 0 && warnings == 0) {
      log.succeed(`Registration successful, expiring after ${project.android.build.expireAfter}.`)
    } else if (errors == 0) {
      log.warn(`Found ${errors} error${errors!=1?'s':''}, ${warnings} warning${warnings!=1?'s':''}`)
    } else {
      log.exit(`Found ${errors} error${errors!=1?'s':''}, ${warnings} warning${warnings!=1?'s':''}`)
    }
  }

  log.note()
  const project = new Project(process.cwd(), 'latest')
  
  // check project

  log.spin('Checking Project...')
  await project.checkingProject()
  if (!project.isPkg) {
    log.fail(`No project.json found in ${project.dir}.`)
    log.help('reactNativeProject')
    errors++
    complete()
  }
  log.succeed(`Found project.json in ${project.dir}.`)

  // check React Native

  log.spin('Checking React Native project...')
  await project.checkingReactNative()
  if (!project.reactNative.version) {
    log.fail('React Native package not found.')
    log.help('reactNativeProject')
    errors++
    complete()
  }
  if (!project.reactNative.isVersionSupported) {
    log.succeed(`Found React Native version ${project.reactNative.version}.`)
    log.fail(`Approov requires a React Native version >= ${project.reactNative.minVersion}.`)
    log.help('reactNativeProject')
    errors++
    complete()
  }
  log.succeed(`Found React Native version ${project.reactNative.version}.`)

  // check Approov CLI

  log.spin(`Checking for Approov CLI...`)
  await project.checkingApproovCli()
  if (!project.approov.cli.isActive) {
    if (!project.approov.cli.isFound()) {
      log.fail('Approov CLI not found; check PATH.')
    } else {
      log.fail('Approov CLI found, but not responding; check activation.')
    }
    log.help('approovCLI')
    errors++
    complete()
  }
  log.succeed(`Found active Approov CLI.`)

  // check android build

  log.spin(`Checking for Android debug APK`)
  await project.checkingAndroidBuild()
  if (!project.android.build.hasApk) {
    log.fail(`Approov debug APK ${project.android.build.apkPath} not found`)
    log.info(`Has \`react-native run-android\` been run?`)
    errors++
    complete()
  }
  log.succeed(`Found Android debug APK.`)
        
  // register the APK

  log.note(`Registering Android debug APK`)
  await project.registeringAndroidBuild(opts.expireAfter)
  if (!project.android.build.isRegistered) {
    log.fail(`Unable to register debug APK ${project.android.build.apkPath}.`)
    log.help('contactSupport')
  }
  log.succeed(`Registered the debug APK ${project.android.build.apkPath} for ${project.android.build.expireAfter}.`)

  complete()
})

module.exports = command
