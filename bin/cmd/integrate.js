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

const { Command } = require('commander')
const prompts = require('prompts')
const { Action, config } = require('../project')

const updatingProps = async (opts) => {
  let tokenName = opts['token.name']
  let tokenPrefix = opts['token.prefix']
  let bindingName = opts['binding.name']
  let usePrefetch = opts['init.prefetch']
  let saveDir = opts['save']

  const onPromptsCancel = (prompt, answers) => {
    cli.exitError('Command aborted.')
  }

  if (opts.prompt) {

    // token name

    response = await prompts([  
      {
        type: 'text',
        name: 'tokenName',
        format: input => input.trim(),
        message: 'Specify Approov token header name',
        initial: tokenName,
        validate: input => input.trim().length > 0 && !/\s/.test(input.trim())
      }
    ], { onCancel: onPromptsCancel })
    tokenName = response.tokenName

    // token prefix 

    response = await prompts([  
      {
        type: 'text',
        name: 'tokenPrefix',
        format: input => input.trim(),
        message: 'Specify prefix to add to the Approov token string, if any',
        initial: tokenPrefix,
      }
    ], { onCancel: onPromptsCancel })
    tokenPrefix = response.tokenPrefix

    // binding name

    response = await prompts([  
      {
        type: 'text',
        name: 'bindingName',
        format: input => input.trim(),
        message: 'Specify binding header data name, if any',
        initial: bindingName,
        validate: input => !/\s/.test(input.trim())
      }
    ], { onCancel: onPromptsCancel })
    bindingName = response.bindingName

    // use prefetch

    response = await prompts([  
      {
        type: 'toggle',
        name: 'usePrefetch',
        message: 'Start token prefetch during app launch?',
        initial: usePrefetch,
        active: 'yes',
        inactive: 'no'
      }
    ], { onCancel: onPromptsCancel })
    usePrefetch = response.usePrefetch
  }

  return {
    tokenName,
    tokenPrefix,
    bindingName,
    usePrefetch,
  }
}

const command = (new Command())

.name('integrate')
.description('Integrate Approov into the current app')

.option('--token.name <name>', 'name of Approov token field', 'Approov-Token')
.option('--token.prefix <string>', 'prefix prepended to Approov token string', '')
.option('--binding.name <name>', 'name of binding field', '')
.option('--init.prefetch', 'start token fetch at app launch', false)
.option('--no-prompt', 'do not prompt for user input', false)
.option('--no-sync', 'do not synchronize integration files into the app', false)
.option('--save <dir>', 'save Approov integration files into this directory', '')
.option('--approov <version>', 'Approov version', config.approovDefaultVersion)

.action(async (opts) => {
  const action = new Action(process.cwd())

  try {
    await action.checkingProject()
    await action.checkingReactNative()
    await action.checkingApproovCli()
    await action.findingApproovApiDomains()

    const props = await updatingProps(opts)

    await action.installingApproovPackage()
    await action.installingAndroidFiles(props)
    await action.installingIosFiles(props)
  } catch (err) {console.log(`err: ${err}`)} // errors reported in complete()

  action.complete("Approov integration completed successfully")
})

module.exports = command
