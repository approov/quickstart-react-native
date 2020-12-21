module.exports = {
  commands: [
    {
      name: 'reg-android',
      description: 'register android debug APK',
      options: [
        {
          name: '--expireAfter <duration>',
          description: 'expire registration after duration',
          default: '1h',
        },
      ],
      func: (args, config, opts) => {
        console.log('reg-android: registers android debug APK for 1 hour.')
        console.log(`  args: ${args}`)
        console.log(`  opts: ${JSON.stringify(opts, null, 2)}`)
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
