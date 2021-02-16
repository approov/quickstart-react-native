const { Command } = require('commander')
const { config, Log, Project } = require('../project')

const command = (new Command())

.name('deploy-ios')
.description('Deploy iOS app on device')

.action(async (opts) => {
  const log = new Log()

  let errors = 0
  let warnings = 0
  const complete = () => {
    log.note()
    if (errors == 0 && warnings == 0) {
      log.succeed(`Deployment successful.`)
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

  // check ios build

  log.spin(`Checking for iOS device app`)
  await project.checkingIosBuild()
  if (!project.ios.build.hasApp) {
    if (project.ios.build.appPath) {
      log.fail(`iOS device app ${project.ios.build.appPath} not found`)
      log.info(`Has \`react-native run-ios --device\` been run?`)  
    } else {
      log.fail(`iOS device app not found`)
      log.help('reactNativeProject')
    }
    errors++
    complete()
  }
  log.succeed(`Found iOS app ${project.ios.build.appPath}.`)

  log.spin(`Checking for ios-deploy command`)
  if (!project.ios.hasIosdeploy) {
    log.fail(`Missing ios-deploy command.`)
    log.info(`Has \`react-native run-ios --device\` been run?`)  
    errors++
    complete()
  }
  log.succeed(`Found ios-deploy command.`)

  // deploy the App

  log.note(`Deploying the iOS device app`)
  await project.deployingIosBuild()
  if (!project.ios.build.isDeployed) {
    log.fail(`Unable to deploy device app.`)
    log.help('contactSupport')
  }
  log.succeed(`Deployed the iOS device app.`)

  complete()
})

module.exports = command
