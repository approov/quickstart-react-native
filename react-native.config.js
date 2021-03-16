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

const plugin = require('./bin/cmd/plugin')

module.exports = {
  commands: [
    {
      name: 'reg-android',
      description: 'register Android debug APK',
      options: [
        {
          name: '--variant <variant>',
          description: 'select build variant',
          default: plugin.optionDefaults.variant,
        },
        {
          name: '--expireAfter <duration>',
          description: 'expire registration after duration',
          default: plugin.optionDefaults.expireAfter,
        },
      ],
      func: async (args, config, opts) => {
        await plugin.registeringAndroid(opts)
      },
      examples: [
        {
          desc: `register Android debug APK for ${plugin.optionDefaults.expireAfter} (default)`,
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
      description: 'register iOS debug device IPA',
      options: [
        {
          name: '--expireAfter <duration>',
          description: 'expire registration after duration',
          default: plugin.optionDefaults.expireAfter,
        },
      ],
      func: async (args, config, opts) => {
        await plugin.registeringIos(opts)
      },
      examples: [
        {
          desc: `register iOS debug device IPA for ${plugin.optionDefaults.expireAfter} (default)`,
          cmd: 'react-native reg-android',
        },
        {
          desc: 'register iOS debug device IPA for 1 year, 2 days, 3 hours, and 4 minutes',
          cmd: 'react-native reg-android --expireAfter 1y2d3h4m',
        },
      ],
    },

    {
      name: 'deploy-ios',
      description: 'deploy iOS debug app to device',
      options: [
      ],
      func: async (args, config, opts) => {
        await plugin.deployingIos(opts)
      },
      examples: [
        {
          desc: `deploy iOS debug app to device`,
          cmd: 'react-native reg-android',
        },
      ],
    },
  ],
}
