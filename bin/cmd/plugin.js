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
  configuration: config.specs.ios.defaultConfiguration,
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

const registeringIos = async (opts) => {
  const project = new Project(process.cwd())

  try {
    await project.checkingReactNative()
    await project.checkingApproovCli()
    await project.registeringIosIpa(opts.configuration, opts.expireAfter)
  } catch (err) { 
    project.handleError(err)
  }

  project.complete(`Registration successful, expiring after ${opts.expireAfter}.`)
}

const deployingIos = async (opts) => {
  const project = new Project(process.cwd())

  try {
    await project.checkingReactNative()
    await project.checkingApproovCli()
    await project.deployingIosApp(opts.configuration, opts.expireAfter)
  } catch (err) { 
    project.handleError(err)
  }

  project.complete(`Deployment successful, expiring after ${opts.expireAfter}.`)
}

module.exports = {
  optionDefaults,
  registeringAndroid,
  registeringIos,
  deployingIos,
}
