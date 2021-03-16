/*
 * MIT License
 *
 * Copyright (c) 2016-present, CriticalBlue Ltd.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute,
 * sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all copies or
 * substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
 * NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT
 * OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

const { Project, config } = require('../act')

const optionDefaults = {
  variant: config.specs.android.defaultVariant,
  expireAfter: config.specs.reg.defaultExpireAfter,
}

const registeringAndroid = async (opts) => {
  const project = new Project(process.cwd())

  try {
    await project.checkingReactNative()
    await project.checkingApproovCli()
    await project.registeringAndroidApk(opts.variant, opts.expireAfter)
  } catch (err) { 
    project.handleError(err)
  }

  project.complete(`Registration successful, expiring after ${opts.expireAfter}.`)
}

const registeringIos = async (opts = {expireAfter: config.approovDefaultExpireAfter}) => {
  // const log = new Log()

  // let errors = 0
  // let warnings = 0
  // const complete = () => {
  //   log.note()
  //   if (errors == 0 && warnings == 0) {
  //     log.succeed(`Registration successful, expiring after ${project.android.build.expireAfter}.`)
  //   } else if (errors == 0) {
  //     log.warn(`Found ${errors} error${errors!=1?'s':''}, ${warnings} warning${warnings!=1?'s':''}`)
  //   } else {
  //     log.exit(`Found ${errors} error${errors!=1?'s':''}, ${warnings} warning${warnings!=1?'s':''}`)
  //   }
  // }

  // log.note()
  // const project = new Project(process.cwd(), 'latest')
  
  // // check project

  // log.spin('Checking Project...')
  // await project.checkingProject()
  // if (!project.isPkg) {
  //   log.fail(`No project.json found in ${project.dir}.`)
  //   log.help('reactNativeProject')
  //   errors++
  //   complete()
  // }
  // log.succeed(`Found project.json in ${project.dir}.`)

  // // check React Native

  // log.spin('Checking React Native project...')
  // await project.checkingReactNative()
  // if (!project.reactNative.version) {
  //   log.fail('React Native package not found.')
  //   log.help('reactNativeProject')
  //   errors++
  //   complete()
  // }
  // if (!project.reactNative.isVersionSupported) {
  //   log.succeed(`Found React Native version ${project.reactNative.version}.`)
  //   log.fail(`Approov requires a React Native version >= ${project.reactNative.minVersion}.`)
  //   log.help('reactNativeProject')
  //   errors++
  //   complete()
  // }
  // log.succeed(`Found React Native version ${project.reactNative.version}.`)

  // // check Approov CLI

  // log.spin(`Checking for Approov CLI...`)
  // await project.checkingApproovCli()
  // if (!project.approov.cli.isActive) {
  //   if (!project.approov.cli.isFound()) {
  //     log.fail('Approov CLI not found; check PATH.')
  //   } else {
  //     log.fail('Approov CLI found, but not responding; check activation.')
  //   }
  //   log.help('approovCLI')
  //   errors++
  //   complete()
  // }
  // log.succeed(`Found active Approov CLI.`)

  // // check ios build

  // log.spin(`Checking for iOS device app`)
  // await project.checkingIosBuild()
  // if (!project.ios.build.hasApp) {
  //   if (project.ios.build.appPath) {
  //     log.fail(`iOS device app ${project.ios.build.appPath} not found`)
  //     log.info(`Has \`react-native run-ios --device\` been run?`)  
  //   } else {
  //     log.fail(`iOS device app not found`)
  //     log.info(`Has \`react-native run-ios --device\` been run?`)
  //   }
  //   errors++
  //   complete()
  // }
  // log.succeed(`Found iOS app ${project.ios.build.appPath}.`)
        
  // // register the IPA

  // log.note(`Registering iOS device IPA`)
  // await project.registeringIosBuild(opts.expireAfter)
  // if (!project.ios.build.isRegistered) {
  //   log.fail(`Unable to register device IPA.`)
  //   log.help('contactSupport')
  // }
  // log.succeed(`Registered the iOS IPA for ${project.android.build.expireAfter}.`)

  // complete()
}

const deployingIos = async (opts) => {
  // const log = new Log()

  // let errors = 0
  // let warnings = 0
  // const complete = () => {
  //   log.note()
  //   if (errors == 0 && warnings == 0) {
  //     log.succeed(`Deployment successful.`)
  //   } else if (errors == 0) {
  //     log.warn(`Found ${errors} error${errors!=1?'s':''}, ${warnings} warning${warnings!=1?'s':''}`)
  //   } else {
  //     log.exit(`Found ${errors} error${errors!=1?'s':''}, ${warnings} warning${warnings!=1?'s':''}`)
  //   }
  // }

  // log.note()
  // const project = new Project(process.cwd(), 'latest')
  
  // // check project

  // log.spin('Checking Project...')
  // await project.checkingProject()
  // if (!project.isPkg) {
  //   log.fail(`No project.json found in ${project.dir}.`)
  //   log.help('reactNativeProject')
  //   errors++
  //   complete()
  // }
  // log.succeed(`Found project.json in ${project.dir}.`)

  // // check React Native

  // log.spin('Checking React Native project...')
  // await project.checkingReactNative()
  // if (!project.reactNative.version) {
  //   log.fail('React Native package not found.')
  //   log.help('reactNativeProject')
  //   errors++
  //   complete()
  // }
  // if (!project.reactNative.isVersionSupported) {
  //   log.succeed(`Found React Native version ${project.reactNative.version}.`)
  //   log.fail(`Approov requires a React Native version >= ${project.reactNative.minVersion}.`)
  //   log.help('reactNativeProject')
  //   errors++
  //   complete()
  // }
  // log.succeed(`Found React Native version ${project.reactNative.version}.`)

  // // check ios build

  // log.spin(`Checking for iOS device app`)
  // await project.checkingIosBuild()
  // if (!project.ios.build.hasApp) {
  //   if (project.ios.build.appPath) {
  //     log.fail(`iOS device app ${project.ios.build.appPath} not found`)
  //     log.info(`Has \`react-native run-ios --device\` been run?`)  
  //   } else {
  //     log.fail(`iOS device app not found`)
  //     log.help('reactNativeProject')
  //   }
  //   errors++
  //   complete()
  // }
  // log.succeed(`Found iOS app ${project.ios.build.appPath}.`)

  // log.spin(`Checking for ios-deploy command`)
  // if (!project.ios.hasIosdeploy) {
  //   log.fail(`Missing ios-deploy command.`)
  //   log.info(`Has \`react-native run-ios --device\` been run?`)  
  //   errors++
  //   complete()
  // }
  // log.succeed(`Found ios-deploy command.`)

  // // deploy the App

  // log.note(`Deploying the iOS device app`)
  // await project.deployingIosBuild()
  // if (!project.ios.build.isDeployed) {
  //   log.fail(`Unable to deploy device app.`)
  //   log.help('contactSupport')
  // }
  // log.succeed(`Deployed the iOS device app.`)

  // complete()
}

module.exports = {
  optionDefaults,
  registeringAndroid,
  registeringIos,
  deployingIos,
}
