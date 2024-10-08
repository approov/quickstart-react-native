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

const { Command, Option } = require('commander');
const path = require('path');
const os = require('os');
const prompts = require('prompts');

// Import colorette functions
const colorette = require('colorette');
const { blue, red, green } = colorette;

// Get other modules
const { config, task } = require('../act');
const { fsx, sh } = require('../util');
const { Log, LogError } = require('../util/log');

const command = (new Command())
.name('example')
.description('Copy a quickstart example app into a new directory')

.arguments('[app] [dir]', {
  app: 'app to copy (default: shapes-fetch)',
  dir: 'directory to copy app into (default: .)'
})
.option('--no-prompt', 'do not prompt for user input')
.addOption(new Option('-a, --all').hideHelp())

.action(async (app, dir, opts) => {
  const log = new Log();

  const getHelp = (id) => {
    return config.refs[id] || config.refs['contactSupport'];
  };

  const defaults = { 
    appName: 'shapes-fetch', 
    dstDir: '.',
    srcDir: path.normalize(path.join(__dirname, '../../examples'))
  };

  let appName = app || defaults.appName;
  let dstDir = dir || defaults.dstDir;

  const validateDst = (dir) => {
    const dstDir = path.normalize(dir || defaults.dstDir);
    const dst = path.join(dstDir, appName);

    if (fsx.isDirectory(dstDir)) {
      if (fsx.isWritable(dstDir)) {
        if (fsx.isAccessible(dst)) {
          return `Destination ${dst} already exists.`;
        } 
      } else {
        return `Destination ${dstDir} not writable.`;
      }
    } else {
      return `Destination ${dstDir} not a directory.`;
    }

    return true;
  };

  const onPromptsCancel = (prompt, answers) => {
    log.exit('Command aborted.');
  };

  // build list of examples
  const srcDir = defaults.srcDir;
  let examples = [];
  fsx.readdirSync(srcDir).forEach(file => {
    try {
      const pkg = require(path.join(srcDir, file, 'package.json'));
      if (pkg) {
        const description = pkg.description || '';
        const hide = !opts.all && pkg.approov && pkg.approov.example === 'hide';
        if (!hide) examples.push({ title: file, description: description, value: file, disable: false });
      }
    } catch { /* ignore files & non-package dirs */ }
  });

  // if prompt, ask for inputs
  if (opts.prompt) {

    // find initial index
    let examplesIndex = examples.findIndex(ex => ex.title === appName);
    if (examplesIndex < 0) {
      examplesIndex = examples.findIndex(ex => ex.title === defaults.appName);
      if (examplesIndex < 0) {
        examplesIndex = 0;
      }
    }

    // gather responses
    let response = await prompts([
      {
        type: 'select',
        name: 'appName',
        message: 'Select example app to copy',
        choices: examples,
        initial: examplesIndex,
      },
    ], { onCancel: onPromptsCancel });
    appName = response.appName;

    response = await prompts([  
      {
        type: 'text',
        name: 'dstDir',
        format: input => input.trim(),
        message: 'Specify destination path',
        initial: dstDir,
        validate: dir => validateDst(dir)
      }
    ], { onCancel: onPromptsCancel });
    dstDir = response.dstDir || defaults.dstDir;
  }

  // check if source is valid
  if (!examples.find(ex => ex.title === appName)) {
    log.exit(`app ${appName} not found`);
  }

  const src = path.join(srcDir, appName);

  // check if destination is valid
  const dstStatus = validateDst(dstDir);
  if (dstStatus !== true) {
    log.exit(dstStatus);
  }

  const dst = path.join(dstDir, appName);

  // copy app
  log.spin(green(`Creating ${appName} example...`));
  try {
    await fsx.copy(src, dst, { overwrite: false, errorOnExist: true });
    log.succeed(`Created ${appName} example.`);
  } catch (err) {
    console.log(`\nERR: ${err}`);
    log.exit(red(`Failed to create ${appName} example.`));
  }

  if (!task.hasEnvYarn(this.dir)) {
    log.warn(`Yarn not found in PATH; the package was copied but not installed.`);
    process.exit(0);
  }

  // install app dependencies
  log.info(`Installing ${appName} npm dependencies...`);
  try {
    sh.cd(dst);
    await sh.execAsync('yarn install', { silent: false });
    log.succeed(`Installed ${appName} npm dependencies`);
  } catch (err) {
    if (task.hasEnvNodeSnap()) {
      log.warn('Detected Node installed as a Snap package', getHelp('nodeSnap'));
    }
    log.exit(`Failed to install ${appName} npm dependencies`);
  }

  // install ios pod dependencies
  if (task.isIosSupported()) {
    if (task.hasEnvPod()) {
      log.info(`Installing ${appName} iOS pod dependencies...`);
      try {
        sh.cd('ios');
        await sh.execAsync('pod install', { silent: false });
        log.succeed(`Installed ${appName} iOS pod dependencies`);
      } catch (err) {
        log.exit(`Failed to install ${appName} iOS pod dependencies`);
      }
    } else {
      log.warn(`Skipping ${appName} iOS pod dependencies; pod install not found in PATH.`);
    }
  } else {
    log.warn(`Pod installation for iOS not available on ${task.getEnvPlatform()}`);
  }

  log.succeed(`Example ${appName} is installed.`);
})

module.exports = command;
