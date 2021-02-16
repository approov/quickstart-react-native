const { config, Log, Project = require('./bin/project')
const { cli } = require('./bin/util')

module.exports = {
  commands: [
    {
      name: 'reg-android',
      description: 'register android debug APK',
      options: [
        {
          name: '--expireAfter <duration>',
          description: 'expire registration after duration',
          default: config.approovDefaultExpireAfter,
        },
      ],
      func: async (args, rnConfig, opts) => {
        const log = new Log()

        let errors = 0
        let warnings = 0
        const complete = () => {
          log.note()
          if (errors == 0 && warnings == 0) {
            log.succeed(`Registration successful, expiring after ${project.android.build.expireAfter}.`)
          } else if (errors == 0) {
            log.warn(`Found${errors} error${errors!=1?'s':''}, ${warnings} warning${warnings!=1?'s':''}`)
          } else {
            log.exit(`Found ${errors} error${errors!=1?'s':''}, ${warnings} warning${warnings!=1?'s':''}`)
          }
        }
      
        log.note()
        const project = new Project(process.cwd(), 'latest')

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
        await project.checkingApproovBuild()
        if (!project.android.build.hasApk) {
          log.fail(`Approov debug APK ${project.android.build.apkPath} not found`)
          log.info(`Has \`react-native run-android\` been run?`)
          errors++
          complete()
        }
        log.succeed(`Found Android debug APK.`)
              
        // register the APK

        log.note(`Registering Android debug APK`)
        await project.registerAndroidBuild(opts.expireAfter)
        if (!project.android.build.isRegistered) {
          log.fail(`Unable to register debug APK ${project.android.build.apkPath}.`)
          log.help('contactSupport')
        }
        log.succeed(`Registered the debug APK ${project.android.build.apkPath} for ${expireAfter}.`)

        complete()
      },
      examples: [
        {
          desc: 'register android debug APK for 1 hour (default)',
          cmd: 'react-native reg-android',
        },
        {
          desc: 'register android debug APK for 1 year, 2 days, 3 hours, and 4 minutes',
          cmd: 'react-native reg-android --expireAfter 1y2d3h4m',
        },
      ],
    },
  ],
}
