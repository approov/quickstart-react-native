const { regAndroid } = require('./bin/register')

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
        regAndroid(args, config, opts)
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
