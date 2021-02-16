const plugin = require('./bin/cmd/plugin.js')

module.exports = {
  commands: [
    {
      name: 'reg-android',
      description: 'register Android debug APK',
      options: [
        {
          name: '--expireAfter <duration>',
          description: 'expire registration after duration',
          default: config.approovDefaultExpireAfter,
        },
      ],
      func: async (args, config, opts) => {
        await plugin.registeringAndroid(opts)
      },
      examples: [
        {
          desc: 'register Android debug APK for 1 hour (default)',
          cmd: 'react-native reg-android',
        },
        {
          desc: 'register Android debug APK for 1 year, 2 days, 3 hours, and 4 minutes',
          cmd: 'react-native reg-android --expireAfter 1y2d3h4m',
        },
      ],
    },

    {
      name: 'reg-ios',
      description: 'register iOS device debug IPA',
      options: [
        {
          name: '--expireAfter <duration>',
          description: 'expire registration after duration',
          default: config.approovDefaultExpireAfter,
        },
      ],
      func: async (args, config, opts) => {
        await plugin.registeringIos(opts)
      },
      examples: [
        {
          desc: 'register iOS device debug IPA for 1 hour (default)',
          cmd: 'react-native reg-ios',
        },
        {
          desc: 'register iOS device debug IPA for 1 year, 2 days, 3 hours, and 4 minutes',
          cmd: 'react-native reg-android --expireAfter 1y2d3h4m',
        },
      ],
    },

    {
      name: 'deploy-ios',
      description: 'deploy iOS device debug IPA',
      options: [],
      func: async (args, config, opts) => {
        await plugin.deployingIos(opts)
      },
      examples: [
        {
          desc: 'deploy iOS device debug IPA to attached device',
          cmd: 'react-native deploy-ios',
        },
      ],
    },
  ],
}
