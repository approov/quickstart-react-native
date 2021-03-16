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

const path = require('path')
const tmp = require('tmp-promise')
const jsonfile = require('jsonfile')
const compareVersions = require('compare-versions')
const lineByline = require('n-readlines')
const xml2js = require('xml2js')
const plist = require('simple-plist')
const { fsx, sh } = require('../util')

// As a general convention, functions with '-ing' verbs are asynchronous:
//   synchronous: can, get, has, is
//   asynchronous: checking, finding, installing

const tasks = {

  // react native and generic info

  getPlatform: function() {
    return process.platform
  },

  hasYarn: function() {
    return !!sh.which('yarn')
  },

  hasPackageSpec: function(dir) {
    return fsx.isDirectory(dir) && fsx.isFile(path.join(dir, 'package.json'))
  },
  
  getPackageSpec: function(dir) {
    if (this.hasPackageSpec(dir)) {
      let filePath = path.join(dir, 'package.json')
      if (!filePath.includes(path.sep)) filePath= `.${path.sep}${filePath}`
      return require(filePath)
    }
    return null
  },

  getReactNativeVersion: function(dir) {
    const pkg = this.getPackageSpec(dir)
    return pkg && pkg.dependencies && pkg.dependencies['react-native']
  },

  isReactNativeVersionSupported: function(version, minVersion) {
    if (!version || !minVersion) return false
    return compareVersions.compare(version, minVersion, '>=')
  },

  hasApproovCli: function() {
    return !!sh.which('approov')
  },

  checkingApproovSessionActive: async function() {
    if (!this.hasApproovCli()) return false
    try {
      await sh.execAsync('echo "xxx" | approov api -list', {silent:true})
      return true
    } catch (err) {}
    return false
  },

  findingApproovApiDomains: async function() {
    let apiDomains = []
    try {
      const { path: tmpFile, cleanup } = await tmp.file()
      try {
        await sh.execAsync(`approov api -getAll ${tmpFile}`, {silent:true})
        const apis = await jsonfile.readFile(tmpFile)
        apiDomains = Object.keys(apis)
      } catch (err) {}
      cleanup()
    } catch (err) {}
    return apiDomains  
  },

  hasApproovPackage: function(dir) {
    const pkg = this.getPackageSpec(dir)
    if (!pkg || !pkg.dependencies) return false
    return '@approov/react-native-approov' in pkg.dependencies
  },

  installingApproovPackage: async function(dir) {
    try {
      await sh.execAsync(`cd ${dir} && yarn add @approov/react-native-approov`, {silent:false})
      return true
    } catch (err) {}
    return false  
  },

  hasAndroidPath: function(dir) {
    return fsx.isDirectory(dir) && fsx.isDirectory(path.join(dir, 'android'))
  },

  getAndroidPath: function(dir) {
    return this.hasAndroidPath(dir) && path.join(dir, 'android')
  },

  hasJava: function() {
    if (process.env['JAVA_HOME']) {
      if (!!sh.which(`${path.join(process.env['JAVA_HOME'], 'bin', 'java')}`)) return true
    }
    return !!sh.which('java')
  },

  hasGradle: function(dir) {
    if (!hasAndroidPath(dir)) return false
    return fsx.isFile(path.join(this.getAndroidPath(dir), 'gradle', 'wrapper', 'gradle-wrapper.jar'))
  },

  findingAndroidMinSdk: async function(dir) {
    let minSdk = 0
    try {
      const buildFile = path.join(this.getAndroidPath(dir), 'build.gradle')
      const lines = new lineByline(buildFile)
      const minSdkLine = /minSdkVersion\s*=\s*(\d+)/
      let line
      while (line = lines.next()) {
        const result = line.toString().match(minSdkLine)
        if (result) {
          const val = parseInt(result[1], 10)
          if (minSdk < val) minSdk = val
        }
      }
    } catch (err) {}
    return minSdk > 0 ? minSdk.toString() : null
  },

  isAndroidMnSdkSupported: function(minSdk, minMinSdk) {
    if (!minSdk || !minMinSdk) return false
    return compareVersions.compare(minSdk, minMinSdk, '>=')
  },

  findingAndroidManifestPermissions: async function(dir) {
    const parser = new xml2js.Parser()
    const manifestFile = path.join(this.getAndroidPath(dir), 'app', 'src', 'main', 'AndroidManifest.xml')
    let permissions = []
    try {
      const data = await fsx.readFile(manifestFile)
      try {
        const result = await parser.parseStringPromise(data)
        permissions = result.manifest['uses-permission'].map(value => {
          return value['$'] && value['$']['android:name']
        }) || []
      } catch (err) {}
    } catch (err) {}
    return permissions
  },

  getAndroidApproovSdkPath: function(dir) {
    return path.join(dir, 'node_modules', '@approov', 'react-native-approov', 'android', 'libs', 'approov.aar')
  },

  hasAndroidApproovSdk: function(dir) {
    return fsx.isFile(this.getAndroidApproovSdkPath(dir))
  },

  installingAndroidApproovSdk: async function(dir) {
    let isInstalled = false
    const sdkPath = this.getAndroidApproovSdkPath(dir)
    if (fsx.isDirectory(path.dirname(sdkPath))) {
      try {
        await sh.execAsync(`approov sdk -getLibrary ${sdkPath}`)
        isInstalled = true
      } catch (err) {}
    }
    return isInstalled
  },

  getAndroidApproovConfigPath: function(dir) {
    return path.join(this.getAndroidPath(dir), 'app', 'src', 'main', 'assets', 'approov.config')
  },

  hasAndroidApproovConfig: function(dir) {
    return fsx.isFile(this.getAndroidApproovConfigPath(dir))
  },

  installingAndroidApproovConfig: async function(dir) {
    let isInstalled = false
    const configPath = this.getAndroidApproovConfigPath(dir)
    if (!fsx.isDirectory(path.dirname(configPath))) {
      // is parent assets dir missing?
      const assetsDir = path.dirname(configPath)
      if ('assets' !== path.basename(assetsDir)) return null
      try {
        await sh.execAsync(`mkdir ${assetsDir}`)
      } catch (err) {}
    }
    if (fsx.isDirectory(path.dirname(configPath))) {
      try {
        await sh.execAsync(`approov sdk -getConfig ${configPath}`)
        isInstalled = true
      } catch (err) {}
    }
    return isInstalled
  },

  getAndroidApproovPropsPath: function(dir) {
    return path.join(this.getAndroidPath(dir), 'app', 'src', 'main', 'assets', 'approov.props')
  },

  hasAndroidApproovProps: function(dir) {
    return fsx.isFile(this.getAndroidApproovConfigPath(dir))
  },

  installingAndroidApproovProps: async function(dir, props) {
    let isInstalled = false
    const propsPath = this.getAndroidApproovPropsPath(dir)
    if (!fsx.isDirectory(path.dirname(propsPath))) {
      // is parent assets dir missing?
      const assetsDir = path.dirname(propsPath)
      if ('assets' !== path.basename(assetsDir)) return null
      try {
        const { stdout } = await sh.execAsync(`mkdir ${assetsDir}`)
      } catch (err) {}
    }
    if (props && fsx.isDirectory(path.dirname(propsPath))) {
      const propsStr = [
        `# Approov props`,
        ``,
        `token.name=${props.tokenName}`,
        `token.prefix=${props.tokenPrefix}`,
        `binding.name=${props.bindingName}`,
        `init.prefetch=${props.usePrefetch}`,
        ``,
      ].join('\n')
  
      try {
        fsx.writeFileSync(propsPath, propsStr)
        isInstalled = true
      } catch (err) {}
    }
    return isInstalled
  },

  getAndroidApkPath: function(dir, variant) {
    return path.join(this.getAndroidPath(dir), 'app', 'build', 'outputs', 'apk', variant, `app-${variant}.apk`)
  },

  hasAndroidApk: function(dir, variant) {
    return fsx.isFile(this.getAndroidApkPath(dir, variant))
  },

  registeringAndroidApk: async function(dir, variant, expireAfter) {
    if (!this.hasAndroidApk(dir, variant)) return false

    let isRegistered = false
    try {
      await sh.execAsync(`approov registration -add ${this.getAndroidApkPath(dir, variant)} -expireAfter ${expireAfter}`, {silent:false})
      isRegistered = true
    } catch (err) {}
    return isRegistered
  },

  hasIosPath: function(dir) {
    return fsx.isDirectory(dir) && fsx.isDirectory(path.join(dir, 'ios'))
  },

  getIosPath: function(dir) {
    return this.hasAndroidPath(dir) && path.join(dir, 'ios')
  },

  canSupportIos: function() {
    return process.platform === 'Darwin'
  },

  hasPod: function() {
    return !!sh.which('pod')
  },

  hasXcodebuild: function() {
    return !!sh.which('xcodebuild')
  },

  hasIosDeploy: function() {
    return !!sh.which('ios-deploy')
  },

  getIosDeployTarget: function(dir) {},
  isIosDeployTragetSupported: function(deployTarget, minDeployTarget) {},
  getIosApproovSdkPath: function(dir) {},
  hasIosApproovSdk: function(dir) {},
  installingIosApproovSdk: async function(dir) {},
  getIosApproovConfigPath: function(dir) {},
  hasIosApproovConfig: function(dir) {},
  installingIosApproovConfig: async function(dir) {},
  getIosApproovPropsPath: function(dir) {},
  hasIosApproovProps: function(dir) {},
  installingIosApproovProps: async function(dir) {},
  installingIosPods: async function(dir) {},
  getIoosAppPath: function(dir, configuration) {},
  hasIoSApp: function(dir, configuration) {},
  getIosIpaPath: function(dir, configuration) {},
  hasIoSIpa: function(dir, configuration) {},
  registeringIosIpa: async function(dir, configuration) {},
  deployingIosIpa: async function(dir, configuration) {},
}

module.exports = tasks
