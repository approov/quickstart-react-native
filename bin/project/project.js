const path = require('path')
const config = require('./config')
const fsx = require('./fsx')
const sh = require('./sh')
const compareVersions = require('compare-versions')
const lineByline = require('n-readlines')
const xml2js = require('xml2js')
const plist = require('simple-plist')
const tmp = require('tmp')

// As my general convention, functions returning promises use verbs ending in '-ing', so for example:
// - writeFile() is a synchronous function
// - writingFile is an asynchronous function

class Project {
  constructor(dir = process.cwd(), version) {
    // init info to be collected (mostly here for documentation)
    this.dir = null
    this.isPkg = false,
    this.json = null,
    this.reactNative = {                // react native checks
      version: null,
      minVersion: '0.60',
      isVersionSupported: false,
      hasAndroid: false,
      hasIos: false,
    }
    this.approov = {
      sdk: {                            // approov sdk checks
        name: null,
        version: null,
        isSupported: false,  
      },
      cli: {                            // approov cli checks
        isFound: false,
        isActive: false,
        version: null,
      },
      api: {                            // protected apis found
        domains: [],
      },
      pkg: {                            // approov pkg checks
        isInstalled: false,
      },
    }
    this.android = {
      path: null,
      minSdk: null,
      minMinSdk: null,
      isMinSdkSupported: false,
      permitsNetworking: false,
      networkPermissions: {
        'android.permission.INTERNET': false,
        'android.permission.ACCESS_NETWORK_STATE': false,
      },
      approov: {                        // android approov checks
        sdkLibraryId: null,
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
      minDeployTarget: null,
      isMDeployTargetSupported: false,
      hasProvisioningProfile: true,
      hasXcodebuild: false,
      hasIosdeploy: false,
      approov: {                        // ios approov checks
        sdkVersion: null,
        sdkType: null,
        sdkLibraryId: null,
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

    // save sdk name
    let name = version
    if (!name || !name.trim()) name = config.approovDefaultVersion
    name = name.trim()
    this.approov.sdk.name = name
  }

  async checkingProject() {
      // read project.json
    if (fsx.isDirectory(this.dir) && fsx.isFile(path.join(this.dir, 'package.json'))) {
      let filePath = path.join(this.dir, 'package.json')
      if (!filePath.includes(path.sep)) filePath= `.${path.sep}${filePath}`
      this.json = require(filePath)
      this.isPkg = true
    }
  }

  async checkingApproovSdk() {
    // get initial approov info
    const release = config.approovVersions[this.approov.sdk.name]
    if (release) {
      this.approov.sdk.version = release.sdkVersion
      this.approov.sdk.isSupported = true
      this.reactNative.minVersion = release.reactNative.minVersion
      this.android.minMinSdk = release.android.minSdk
      this.android.approov.sdkLibraryId = release.android.sdkLibraryId
      this.ios.minDeployTarget = release.ios.minDeployTarget
      this.ios.approov.sdkType = release.ios.sdkType
      this.ios.approov.sdkLibraryId = release.ios.sdkLibraryId 
    } else {
      this.approov.sdk.isSupported = false
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
      await sh.execAsync('approov whoami', {silent:true})
    } catch (err) {
      isActive = false
    }
    isActive = true
    this.approov.cli.isActive = isActive

    // scrape version (if needed in future)
    this.approov.cli.version = '0.0'
  }

  async findingApproovApiDomains() {
    const extractDomains = (str) => {
      if (!str) return []  
      const lines = str.split(/\r?\n/)
      // grab only indented non-empty lines
      return lines.filter(str => /^\s+\S/.test(str)).map(str => str.trim())
    }

    let apiDomains =[]
    try {
      const { stdout } = await sh.execAsync('approov api -list', {silent:true})
      apiDomains = extractDomains(stdout)
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
      const libId = this.android.approov.sdkLibraryId
      try {
        const { stdout } = await sh.execAsync(`approov sdk -libraryID ${libId} -getLibrary ${sdkPath}`)
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
      const libId = this.ios.approov.sdkLibraryId
      let isZipped = false
      try {
        console.log(`approov sdk -libraryID ${libId} -getLibrary ${zipPath}`)
        const { stdout } = await sh.execAsync(`approov sdk -libraryID ${libId} -getLibrary ${zipPath}`)
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
    console.log(`app Dir: ${appDir}`)
    console.log(`pay Dir: ${payDir}`)
    console.log(`ipa file: ${ipaFile}`)


    // @TODO: do more of this in node rather than all in shell
    try {
      const ipaCreate = [
        `rm -rf ${payDir} ${ipaFile}`,
        `mkdir ${payDir}`,
        `cp -r ${appDir} ${payDir}/`,
        `zip -9 -r ${ipaFile} ${payDir}`,
        `rm -rf ${payDir}`,
      ].join(' && ')
      console.log(ipaCreate)
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
    } catch (err) {console.log(`err: ${err}`)}
    this.ios.build.isRegistered = isRegistered
    this.ios.build.expireAfter = expireAfter
  }

  async deployingIosBuild(expireAfter = config.approovDefaultExpireAfter) {
    if (!this.ios.build.hasApp || !this.ios.hasIosdeploy) return

    let isDeployed = false
    try {
      await sh.execAsync(`ios-deploy -b ${this.ios.build.appPath}`)
      isDeployed = true
    } catch (err) {console.log(`err: ${err}`)}
    this.ios.build.isDeployed = isDeployed
  }
}

module.exports = Project
