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

  // host environment

  getEnvPlatform: function() {
    return process.platform
  },

  hasEnvYarn: function() {
    return !!sh.which('yarn')
  },

  hasEnvApproov: function() {
    return !!sh.which('approov')
  },

  checkingEnvApproovSessionActive: async function() {
    if (!this.hasEnvApproov()) return false
    try {
      await sh.execAsync('echo "" | approov api -list', {silent:true})
      await sh.execAsync('approov role .', {silent:true})
      return true
    } catch (err) {}
    return false
  },

  hasEnvJava: function() {
    if (process.env['JAVA_HOME']) {
      if (!!sh.which(`${path.join(process.env['JAVA_HOME'], 'bin', 'java')}`)) return true
    }
    return !!sh.which('java')
  },

  hasEnvPod: function() {
    return !!sh.which('pod')
  },

  hasEnvXcodebuild: function() {
    return !!sh.which('xcodebuild')
  },

  hasEnvIosDeploy: function() {
    return !!sh.which('ios-deploy')
  },

  // react native info

  hasReactNativePackageSpec: function(dir) {
    return fsx.isDirectory(dir) && fsx.isFile(path.join(dir, 'package.json'))
  },
  
  getReactNativePackageSpec: function(dir) {
    if (this.hasReactNativePackageSpec(dir)) {
      let filePath = path.join(dir, 'package.json')
      if (!filePath.includes(path.sep)) filePath= `.${path.sep}${filePath}`
      return require(filePath)
    }
    return null
  },

  getReactNativeVersion: function(dir) {
    const pkg = this.getReactNativePackageSpec(dir)
    return pkg && pkg.dependencies && pkg.dependencies['react-native']
  },

  isReactNativeVersionSupported: function(version, minVersion) {
    if (!version || !minVersion) return false
    return compareVersions.compare(version, minVersion, '>=')
  },

  findingReactNativeApproovApiDomains: async function() {
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

  hasReactNativeApproovPackage: function(dir) {
    const pkg = this.getReactNativePackageSpec(dir)
    if (!pkg || !pkg.dependencies) return false
    return '@approov/react-native-approov' in pkg.dependencies
  },

  installingReactNativeApproovPackage: async function(dir) {
    try {
      await sh.execAsync(`cd ${dir} && yarn add @approov/react-native-approov`, {silent:false})
      return true
    } catch (err) {}
    return false  
  },

  // android info

  getAndroidPath: function(dir) {
    return path.join(dir, 'android')
  },

  hasAndroidPath: function(dir) {
    return fsx.isDirectory(this.getAndroidPath(dir))
  },

  hasAndroidGradle: function(dir) {
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

  // ios

  isIosSupported: function() {
    return this.getEnvPlatform() === 'darwin'
  },

  getIosPath: function(dir) {
    return path.join(dir, 'ios')
  },

  hasIosPath: function(dir) {
    return fsx.isDirectory(this.getIosPath(dir))
  },

  getIosScheme: function(dir) {
    let scheme = null
    try {
      const files = fsx.readdirSync(this.getIosPath(dir)).filter(f => f.endsWith('.xcworkspace'))
      if (files.length == 1) {
        scheme = path.basename(files[0], '.xcworkspace')
      }
    } catch (err) {}
    return scheme
  },

  getIosWorkspacePath(dir, scheme) {
    if (!scheme) scheme = this.getIosScheme(dir)

    return path.join(this.getIosPath(dir), `${scheme}.xcworkspace`)
  },

  hasIosWorkspace: function(dir, scheme) {
    return fsx.isDirectory(this.getIosWorkspacetPath(dir, scheme))
  },

  findingIosDeployTarget: async function(dir, scheme, configuration) {
    if (!scheme) scheme = this.getIosScheme(dir)
    if (!configuration) configuration = 'Debug'

    const workspace = this.getIosWorkspacePath(dir, scheme)

    let target = null
    try {
      const buildSettings = `xcodebuild -workspace ${workspace} -scheme ${scheme} -configuration ${configuration} -showBuildSettings`
      const { stdout } = await sh.execAsync(buildSettings, {silent:true})
      const targetLines = stdout.split('\n').filter(line => (line.match(/IPHONEOS_DEPLOYMENT_TARGET\s*=\s*(.*)/)))
      if (targetLines.length > 0) {
        const targetMatch = targetLines[targetLines.length - 1].match(/IPHONEOS_DEPLOYMENT_TARGET\s*=\s*(.*)/)
        if (targetMatch && targetMatch.length >= 2) target = targetMatch[1].trim()
      }
    } catch (err) {}
    return target
  },

  isIosDeployTargetSupported: function(deployTarget, minDeployTarget) {
    if (!deployTarget || !minDeployTarget) return false
    return compareVersions.compare(deployTarget, minDeployTarget, '>=')
  },

  getIosApproovSdkPath: function(dir) {
    return path.join(dir, 'node_modules', '@approov', 'react-native-approov', 'ios', 'Approov.framework')
  },

  hasIosApproovSdk: function(dir) {
    return fsx.isDirectory(this.getIosApproovSdkPath(dir))
  },

  installingIosApproovSdk: async function(dir) {
    let isInstalled = false
    const sdkPath = this.getIosApproovSdkPath(dir)
    if (fsx.isDirectory(path.dirname(sdkPath))) {
      const zipPath = path.join(path.dirname(sdkPath), 'Approov.zip')
      let isZipped = false
      try {
        await sh.execAsync(`approov sdk -getLibrary ${zipPath}`)
        isZipped = true
      } catch (err) {
        try {
          await sh.execAsync(`rm -f ${zipPath}`)
        } catch (err) {}
      }
      if (isZipped) {
        try {
          await sh.execAsync(`rm -rf ${sdkPath} && unzip ${zipPath} -d ${path.dirname(zipPath)} && rm -f ${zipPath}`)
          isInstalled = true
        } catch (err) {
          try {
            await sh.execAsync(`rm -f ${zipPath}`)
          } catch (err) {}
        }
      } 
    }
    return isInstalled
  },

  getIosApproovConfigPath: function(dir) {
    return path.join(dir, 'node_modules', '@approov', 'react-native-approov', 'ios', 'approov.config')
  },

  hasIosApproovConfig: function(dir) {
    return fsx.isFile(this.getIosApproovConfigPath(dir))
  },

  installingIosApproovConfig: async function(dir) {
    let isInstalled = false
    const configPath = this.getIosApproovConfigPath(dir)
    if (fsx.isDirectory(path.dirname(configPath))) {
      try {
        const { stdout } = await sh.execAsync(`approov sdk -getConfig ${configPath}`)
        isInstalled = true
      } catch (err) {}
    }
    return isInstalled
  },

  getIosApproovPropsPath: function(dir) {
    return path.join(dir, 'node_modules', '@approov', 'react-native-approov', 'ios', 'approov.plist')
  },

  hasIosApproovProps: function(dir) {
    return fsx.isFile(this.getIosApproovPropsPath(dir))
  },

  installingIosApproovProps: async function(dir, props) {
    let isInstalled = false
    const propsPath = this.getIosApproovPropsPath(dir)
    if (props && fsx.isDirectory(path.dirname(propsPath))) {
      const plistProps = {
        'token.name':    props.tokenName,
        'token.prefix':  props.tokenPrefix,
        'binding.name':  props.bindingName,
        'init.prefetch': props.usePrefetch,
      }
      try {
        plist.writeFileSync(propsPath, plistProps)
        isInstalled = true
      } catch (err) {}
    }
    return isInstalled
  },
  
  installingIosPods: async function(dir) {
    let isInstalled = false
    try {
      sh.cd(this.getIosPath(dir))
      await sh.execAsync('pod install', {silent:false})
      isInstalled = true
    } catch (err) {
    }
    return isInstalled
  },

  findingIosAppPath: async function(dir, scheme, configuration) {
    if (!scheme) scheme = this.getIosScheme(dir)
    if (!configuration) configuration = 'Debug'

    const workspace = this.getIosWorkspacePath(dir, scheme)

    let buildDir = null
    try {
      const buildSettings = `xcodebuild -workspace ${workspace} -scheme ${scheme} -configuration ${configuration} -showBuildSettings`
      const { stdout } = await sh.execAsync(buildSettings, {silent:true})
      const buildDirLines = stdout.split('\n').filter(line => (line.match('TARGET_BUILD_DIR')))
      if (buildDirLines.length == 1) {
        const buildDirMatch = buildDirLines[0].match(/TARGET_BUILD_DIR\s*=\s*(.*)/)
        if (buildDirMatch && buildDirMatch.length >= 2) buildDir = buildDirMatch[1].trim()
      }
    } catch (err) {}
    if (!buildDir) return null
    return path.join(buildDir, `${name}.app`)
  },

  hasIoSApp: function(appPath) {
    return fsx.isDirectory(appPath)
  },

  getIosIpaPath: function(dir, scheme, configuration) {
    if (!scheme) scheme = this.getIosScheme(dir)
    if (!configuration) configuration = 'Debug'

    return path.join(this.dir, 'node_modules', '@approov', 'react-native-approov', 'ios', 'build', configuration, `${scheme}.ipa`)
  },

  isIoSIpaCurrent: function(appPath, ipaPath) {
    return fsx.isFile(ipaPath) && this.hasIosApp(appPath) && (fsx.compareMtimes(ipaPath, appPath) > 0)
  },

  buildingIosIpa: async function(appPath, ipaPath) {
    const payPath = path.join(path.dirname(ipaPath), 'Payload')

    let isBuilt = false
    try {
      // use node fsx & zip utils instead?
      const ipaCreate = [
        `mkdir -p ${path.dirname(ipaPath)}`,
        `rm -rf ${payPath} ${ipaPath}`,
        `mkdir ${payPath}`,
        `cp -r ${appPath} ${payPath}/`,
        `zip -9 -r ${ipaPath} ${payPath}`,
        `rm -rf ${payPath}`,
      ].join(' && ')
      await sh.execAsync(ipaCreate, {silent:true})
      isBuilt = true
    } catch (err) {
      console.log(err)
      try {
        await sh.execAsync(`rm -rf ${payPath} ${ipaPath}`)
      } catch (err) {}
    }
    return isBuilt
  },

  registeringIosIpa: async function(dir, scheme, configuration, expireAfter) {
    const appPath = await this.findingIosAppPath(dir, scheme, configuration)
    if (!this.hasIosApp) return false

    const ipaPath = this.getIosIpaPath(dir, scheme, configuration)
    if (!this.isIosIpaCurrent(ipaPath, appPath)) {
      const isBuilt = await this.buildingIosIpa(ipaPath, appPath)
      if (!isBuilt) return false
    }

    if (!expireAfter) expireAfter = '1h'
    let isRegistered = false
    try {
      await sh.execAsync(`approov registration -add ${ipaPath} -expireAfter ${expireAfter}`, {silent:false})
      isRegistered = true
    } catch (err) {}
    return isRegistered
  },

  deployingIosIpa: async function(dir, scheme, configuration) {
    const appPath = await this.findingIosAppPath(dir, scheme, configuration)
    if (!this.hasIosApp) return false

    const ipaPath = this.getIosIpaPath(dir, scheme, configuration)
    if (!this.isIosIpaCurrent(ipaPath, appPath)) {
      const isBuilt = await this.buildingIosIpa(ipaPath, appPath)
      if (!isBuilt) return false
    }

    let isDeployed = false
    try {
      await sh.execAsync(`ios-deploy -b ${this.ios.build.appPath}`)
      isDeployed = true
    } catch (err) {}
    return isDeployed
  },
}

module.exports = tasks
