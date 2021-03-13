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
const config = require('./config')
const fsx = require('./fsx')
const sh = require('./sh')
const compareVersions = require('compare-versions')
const lineByline = require('n-readlines')
const xml2js = require('xml2js')
const plist = require('simple-plist')

// As my general convention, functions returning promises use verbs ending in '-ing', so for example:
// - writeFile() is a synchronous function
// - writingFile is an asynchronous function

class Project {
  constructor(dir = process.cwd()) {
    // init info to be collected (mostly here for documentation)
    this.dir = null
    this.platform = null
    this.isIosDevPlatform = false
    this.isPkg = false,
    this.json = null,
    this.reactNative = {                // react native checks
      version: null,
      minVersion: config.specs.reactNative.minVersion,
      isVersionSupported: false,
      hasAndroid: false,
      hasIos: false,
    }
    this.approov = {
      cli: {                            // approov cli checks
        isFound: false,
        isActive: false,
        version: null,
      },
      api: {                            // protected apis found
        domains: [],
        domainsJsonPath: null,
      },
      pkg: {                            // approov pkg checks
        isInstalled: false,
      },
    }
    this.android = {
      path: null,
      minSdk: null,
      minMinSdk: config.specs.android.minSdk,
      isMinSdkSupported: false,
      permitsNetworking: false,
      networkPermissions: {
        'android.permission.INTERNET': false,
        'android.permission.ACCESS_NETWORK_STATE': false,
      },
      approov: {                        // android approov checks
        sdkPath: null,
        hasSdk: false,
        configPath: null,
        hasConfig: false,
        propsPath: null,
        hasProps: false,
      },
      build: {                          // android build info
        hasApk: false,
        apkPath: null,
        isRegistered: false,
        expireAfter: null,
        isDeployed: false,
      },
    }
    this.ios = {                        // ios project checks
      path: null,
      name: null,
      deployTarget: null,
      minDeployTarget: config.specs.ios.minDeployTarget,
      isMDeployTargetSupported: false,
      hasProvisioningProfile: true,
      hasXcodebuild: false,
      hasIosdeploy: false,
      approov: {                        // ios approov checks
        isBitcodeSdk: false,
        sdkPath: null,
        hasSdk: false,
        configPath: null,
        hasConfig: false,
        propsPath: null,
        hasProps: false,
      },
      build: {                          // ios build checks
        hasDeviceApp: false,
        deviceAppPath: null,
        deviceAppBuildTime: null,
        hasDeviceIpa: false,
        deviceIpa: null,
        deviceIpaPath: null,
        isRegistered: false,
        expireAfter: null,
      },
    }

    // save dir
    this.dir = dir
  }

  async checkingProject() {

    this.platform = process.platform
    this.isIosDevPlatform = this.platform.toLowerCase() === 'darwin'
    
    if (fsx.isDirectory(this.dir) && fsx.isFile(path.join(this.dir, 'package.json'))) {
      let filePath = path.join(this.dir, 'package.json')
      if (!filePath.includes(path.sep)) filePath= `.${path.sep}${filePath}`
      this.json = require(filePath)
      this.isPkg = true
    }
  }

  async checkingReactNative() {
    if (!this.isPkg) return

    // react native installed?
    if (!this.json || !this.json.dependencies) return
    this.reactNative.version = this.json.dependencies['react-native']
    if (!this.reactNative.version) return

    //supported version?
    let isSupported = false
    try {
      isSupported = compareVersions.compare(this.reactNative.version, this.reactNative.minVersion, '>=')
    } catch (err) {}
    this.reactNative.isVersionSupported = isSupported

    // has android project?
    this.android.path = path.join(this.dir, 'android')
    this.reactNative.hasAndroid = fsx.isFile(path.join(this.android.path, 'build.gradle'))
    this.android.approov.sdkPath = path.join(this.dir, 'node_modules', '@approov', 'react-native-approov', 'android', 'libs', 'approov.aar')
    this.android.approov.configPath = path.join(this.android.path, 'app', 'src', 'main', 'assets', 'approov.config')
    this.android.approov.propsPath = path.join(this.android.path, 'app', 'src', 'main', 'assets', 'approov.props')
    this.android.build.apkPath = path.join(this.android.path, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')

    // has ios project?
    this.ios.path = path.join(this.dir, 'ios')
    let name = null
    try {
      const files = fsx.readdirSync(this.ios.path).filter(fn => fn.endsWith('.xcworkspace'));
      if (files.length == 1) {
        name = path.basename(files[0], '.xcworkspace')
      }
    } catch (err) {}
    if (name) this.ios.name = name
    this.reactNative.hasIos = !!name
    this.ios.hasXcodebuild = !!sh.which('xcodebuild')
    this.ios.hasIosdeploy= !!sh.which('ios-deploy')
    this.ios.approov.sdkPath = path.join(this.dir, 'node_modules', '@approov', 'react-native-approov', 'ios', 'Approov.framework')
    this.ios.approov.configPath = path.join(this.dir, 'node_modules', '@approov', 'react-native-approov', 'ios', 'approov.config')
    this.ios.approov.propsPath = path.join(this.dir, 'node_modules', '@approov', 'react-native-approov', 'ios', 'approov.plist')
    this.ios.build.payPath = path.join(this.dir, 'node_modules', '@approov', 'react-native-approov', 'ios', 'build', `Payload`)
    this.ios.build.ipaPath = path.join(this.dir, 'node_modules', '@approov', 'react-native-approov', 'ios', 'build', `${name}.ipa`)
  }

  async checkingApproovCli() {
    // in path?
    this.approov.cli.isFound = !!sh.which('approov')

    // properly set up?
    let isActive = false
    try {
      const { code, stdout, stderr } = await sh.execAsync('echo "xxx" | approov api -list', {silent:true})
      isActive = true
    } catch (err) {
      isActive = false
    }
    this.approov.cli.isActive = isActive
  }

  async findingApproovApiDomains() {
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
    this.approov.api.domains = apiDomains
  }

  async checkingApproovPkg() {
    if (!this.json || !this.json.dependencies) return
    
    this.approov.pkg.isInstalled = '@approov/react-native-approov' in this.json.dependencies
  }

  async installingApproovPkg() {
    let isInstalled = false
    try {
      await sh.execAsync(`cd ${this.dir} && yarn add @approov/react-native-approov`, {silent:false})
      isInstalled = true
    } catch (err) {}
    this.approov.pkg.isInstalled = isInstalled
  }

  async checkingAndroidProject() {
    if (!this.reactNative.hasAndroid) return

    // min SDK okay?
    let minSdk = 0
    try {
      const buildFile = path.join(this.android.path, 'build.gradle')
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
    this.android.minSdk = minSdk > 0 ? minSdk.toString() : null
    let isSupported = false
    if (this.android.minSdk) {
      try {
        isSupported = compareVersions.compare(this.android.minSdk, this.android.minMinSdk, '>=')
      } catch (err) {}
    }
    this.android.isMinSdkSupported = isSupported

    // check network permissions
    const parser = new xml2js.Parser()
    const manifestFile = path.join(this.android.path, 'app', 'src', 'main', 'AndroidManifest.xml')
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
    const list = ['android.permission.INTERNET', 'android.permission.ACCESS_NETWORK_STATE']
    let hasAll = true
    list.forEach(p => {
      this.android.networkPermissions[p] = permissions.includes(p)
      hasAll &&= permissions.includes(p)
    })
    this.android.permitsNetworking = hasAll
  }

  async checkingAndroidApproov() {
    if (!this.reactNative.hasAndroid || !this.approov.pkg.isInstalled) return

    this.android.approov.hasSdk = fsx.isFile(this.android.approov.sdkPath)
    this.android.approov.hasConfig = fsx.isFile(this.android.approov.configPath)
    this.android.approov.hasProps = fsx.isFile(this.android.approov.propsPath)
  }

  async installingAndroidApproovSdk() {
    let isInstalled = false
    const sdkPath = this.android.approov.sdkPath
    if (fsx.isDirectory(path.dirname(sdkPath))) {
      try {
        const { stdout } = await sh.execAsync(`approov sdk -getLibrary ${sdkPath}`)
        isInstalled = true
      } catch (err) {}
    }
    this.android.approov.hasSdk = isInstalled
  }

  async installingAndroidApproovConfig() {
    // base config
    let isInstalled = false
    const configPath = this.android.approov.configPath
    if (!fsx.isDirectory(path.dirname(configPath))) {
      // is parent assets dir missing?
      const assetsDir = path.dirname(configPath)
      if ('assets' !== path.basename(assetsDir)) return null
      try {
        const { stdout } = await sh.execAsync(`mkdir ${assetsDir}`)
      } catch (err) {}
    }
    if (fsx.isDirectory(path.dirname(configPath))) {
      try {
        const { stdout } = await sh.execAsync(`approov sdk -getConfig ${configPath}`)
        isInstalled = true
      } catch (err) {}
    }
    this.android.approov.hasConfig = isInstalled
  }

  async installingAndroidApproovProps(props) {
    let isInstalled = false
    const propsPath = this.android.approov.propsPath
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
    this.android.approov.hasProps = isInstalled
  }

  async checkingIosProject() {
    if (!this.reactNative.hasIos) return

    if (this.ios.hasXcodebuild) {
      let target = null
      try {
        const buildSettings = `xcodebuild -workspace ios/${this.ios.name}.xcworkspace -scheme ${this.ios.name} -configuration Debug -showBuildSettings`
        const { stdout } = await sh.execAsync(buildSettings, {silent:true})
        const targetLines = stdout.split('\n').filter(line => (line.match(/IPHONEOS_DEPLOYMENT_TARGET\s*=\s*(.*)/)))
        if (targetLines.length > 0) {
          const targetMatch = targetLines[targetLines.length - 1].match(/IPHONEOS_DEPLOYMENT_TARGET\s*=\s*(.*)/)
          if (targetMatch && targetMatch.length >= 2) target = targetMatch[1].trim()
        }
      } catch (err) {}
      this.ios.deployTarget = target
      let isSupported = false
      if (this.ios.deployTarget) {
        try {
          isSupported = compareVersions.compare(this.ios.deployTarget, this.ios.minDeployTarget, '>=')
        } catch (err) {}
      }
      this.ios.isDeployTargetSupported = isSupported
    }
  }

  async checkingIosApproov() {
    if (!this.reactNative.hasIos || !this.approov.pkg.isInstalled) return

    this.ios.approov.hasSdk = fsx.isDirectory(this.ios.approov.sdkPath)
    this.ios.approov.hasConfig = fsx.isFile(this.ios.approov.configPath)
    this.ios.approov.hasProps = fsx.isFile(this.ios.approov.propsPath)
  }

  async installingIosApproovSdk() {
    let isInstalled = false
    const sdkPath = this.ios.approov.sdkPath
    if (fsx.isDirectory(path.dirname(sdkPath))) {
      const zipPath = path.join(path.dirname(sdkPath), 'Approov.zip')
      let isZipped = false
      try {
        const { stdout } = await sh.execAsync(`approov sdk -getLibrary ${zipPath}`)
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
    this.ios.approov.hasSdk = isInstalled
  }

  async installingIosApproovConfig() {
    // base config
    let isInstalled = false
    const configPath = this.ios.approov.configPath
    if (fsx.isDirectory(path.dirname(configPath))) {
      try {
        const { stdout } = await sh.execAsync(`approov sdk -getConfig ${configPath}`)
        isInstalled = true
      } catch (err) {}
    }
    this.ios.approov.hasConfig = isInstalled
  }

  async installingIosApproovProps(props) {
    let isInstalled = false
    const propsPath = this.ios.approov.propsPath
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
    this.ios.approov.hasProps = isInstalled
  }
  
  async updatingIosPods() {
    const iosPath = this.ios.path
    if (!fsx.isDirectory(iosPath)) return

    let updatedPods = false
    try {
      await sh.execAsync(`cd ${iosPath} && pod install`, {silent:false})
      updatedPods = true
    } catch (err) { console.log(`err: ${err}`) }
    this.ios.updatedPods = updatedPods
  }
  
  async checkingAndroidBuild() {
    this.android.build.hasApk = fsx.isFile(this.android.build.apkPath)
  }

  async registeringAndroidBuild(expireAfter = config.approovDefaultExpireAfter) {
    if (!this.android.build.hasApk) return

    let isRegistered = false
    try {
      await sh.execAsync(`approov registration -add ${this.android.build.apkPath} -expireAfter ${expireAfter}`, {silent:false})
      isRegistered = true
    } catch (err) {console.log(`err: ${err}`)}
    this.android.build.isRegistered = isRegistered
    this.android.build.expireAfter = expireAfter
  }
  
  async checkingIosBuild() {
    const name = this.ios.name
    if (!name) return

    let buildDir = null
    try {
      const buildSettings = `xcodebuild -workspace ios/${name}.xcworkspace -scheme ${name} -configuration Debug -showBuildSettings`
      const { stdout } = await sh.execAsync(buildSettings, {silent:true})
      const buildDirLines = stdout.split('\n').filter(line => (line.match('TARGET_BUILD_DIR')))
      if (buildDirLines.length == 1) {
        const buildDirMatch = buildDirLines[0].match(/TARGET_BUILD_DIR\s*=\s*(.*)/)
        if (buildDirMatch && buildDirMatch.length >= 2) buildDir = buildDirMatch[1].trim()
      }
    } catch (err) {}
    if (!buildDir) {
      this.ios.build.appPath = null
      this.ios.build.hasApp = false
    } else {
      this.ios.build.appPath = path.join(buildDir, `${name}.app`)
      this.ios.build.hasApp = fsx.isDirectory(this.ios.build.appPath)
    }
  }

  async registeringIosBuild(expireAfter = config.approovDefaultExpireAfter) {
    if (!this.ios.build.hasApp) return

    const appName = this.ios.name
    const appDir = this.ios.build.appPath
    const payDir = this.ios.build.payPath
    const ipaFile = this.ios.build.ipaPath

    // @TODO: use node fsx & zip utils?
    try {
      const ipaCreate = [
        `rm -rf ${payDir} ${ipaFile}`,
        `mkdir ${payDir}`,
        `cp -r ${appDir} ${payDir}/`,
        `zip -9 -r ${ipaFile} ${payDir}`,
        `rm -rf ${payDir}`,
      ].join(' && ')
      await sh.execAsync(ipaCreate, {silent:true})
    } catch (err) {
      console.log(err)
      try {
        await sh.execAsync(`rm -rf ${payDir} ${ipaFile}`)
      } catch (err) {}
      return null
    }

    let isRegistered = false
    try {
      await sh.execAsync(`approov registration -add ${this.ios.build.ipaPath} -expireAfter ${expireAfter}`, {silent:false})
      isRegistered = true
    } catch (err) {}
    this.ios.build.isRegistered = isRegistered
    this.ios.build.expireAfter = expireAfter
  }

  async deployingIosBuild(expireAfter = config.approovDefaultExpireAfter) {
    if (!this.ios.build.hasApp || !this.ios.hasIosdeploy) return

    let isDeployed = false
    try {
      await sh.execAsync(`ios-deploy -b ${this.ios.build.appPath}`)
      isDeployed = true
    } catch (err) {}
    this.ios.build.isDeployed = isDeployed
  }
}

module.exports = Project
