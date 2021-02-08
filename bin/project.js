const path = require('path')
const { cli, fsx, shell } = require('./util')
const Specs = require('./specs')
const compareVersions = require('compare-versions')
const lineByline = require('n-readlines')
const xml2js = require('xml2js')
const plist = require('simple-plist')

// As my general convention, functions returning promises use verbs ending in '-ing', so for example:
// - writeFile() is a synchronous function
// - writingFile is an asynchronous function

class Project {
  constructor(dir = process.cwd(), version = 'latest') {
    // save dir
    this.dir = dir

    // clear cached ios project name
    this.iosProjectName = null

    // read project.json
    if (!fsx.isDirectory(dir) && !fsx.isFile(path.join(dir, 'package.json'))) {
      this.json = null
    } else {
      let filePath = path.join(dir, 'package.json')
      if (!filePath.includes(path.sep)) filePath= `.${path.sep}${filePath}`
      this.json = require(filePath)
    }

    // get specs
    this.specs = Specs.forApproovVersion(version)
  }

  isPackage() {
    return (!!this.json)
  }

  getReactNativeVersion() {
    if (!this.json || !this.json.dependencies) return null
    
    return this.json.dependencies['react-native']
  }

  isReactNativeVersionSupported(version) {
    if (!version) return false

    try {
      return compareVersions.compare(version, this.specs.reactNativeMinVersion, '>=')
    } catch (err) {}
    return false
  }

  isApproovCLIFound() {
    return !!shell.which('approov')
  }

  async checkingIfApproovCLIActive() {
    try {
      const { stdout, stderr } = await shell.execAsync('approov whoami')
    } catch (err) {
      return false
    }
    return true
  }

  async findingProtectedAPIDomains() {
    const extractDomains = (str) => {
      if (!str) return []  
      const lines = str.split(/\r?\n/)
      // grab only indented non-empty lines
      return lines.filter(str => /^\s+\S/.test(str)).map(str => str.trim())
    }
    let apiDomains =[]
    try {
      const { stdout } = await shell.execAsync('approov api -list')
      apiDomains = extractDomains(stdout)
    } catch (err) {
      return null
    }
    return apiDomains
  }

  isApproovPackageInstalled() {
    if (!this.json || !this.json.dependencies) return null
    
    return this.json.dependencies['@approov/react-native-approov']
  }

  async installingApproovPackage() {
    try {
      await shell.execAsync(`cd ${this.dir} && yarn add @approov/react-native-approov`, {silent:false})
    } catch (err) {
      console.log(err)
      return false
    }
    return true
  }

  isAndroidProject() {
    const buildFile = path.join(this.dir, 'android', 'build.gradle')
    return fsx.isFile(buildFile)
  }

  async findingAndroidMinSDK() {
    let minSDK = 0

    try {
      const buildFile = path.join(this.dir, 'android', 'build.gradle')
      const lines = new lineByline(buildFile)
      const minSDKLine = /minSdkVersion\s*=\s*(\d+)/
      let line
      while (line = lines.next()) {
        const result = line.toString().match(minSDKLine)
        if (result) {
          const val = parseInt(result[1], 10)
          if (minSDK < val) minSDK = val
        }
      }
      return minSDK > 0 ? minSDK.toString() : null
    } catch (err) {}
    return null
  }

  isAndroidMinSDKSupported(minSDK) {
    if (!minSDK) return false
    try {
      return compareVersions.compare(minSDK, this.specs.androidMinSDK, '>=')
    } catch (err) {}
    return false
  }

  async findingAndroidNetworkPermissions() {
    const parser = new xml2js.Parser()
    const manifestFile = path.join(this.dir, 'android', 'app', 'src', 'main', 'AndroidManifest.xml')
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
  }

  getAndroidApproovSDKPath() {
    return path.join(this.dir, 'node_modules', '@approov', 'react-native-approov', 'android', 'libs', 'approov.aar')
  }

  hasAndroidApproovSDK() {
    return fsx.isFile(this.getAndroidApproovSDKPath())
  }

  async writingAndroidApproovSDK(targetPath = this.getAndroidApproovSDKPath()) {
    if (!fsx.isDirectory(path.dirname(targetPath))) return null

    const libID = this.specs.androidLibraryID
    try {
      const { stdout } = await shell.execAsync(`approov sdk -libraryID ${libID} -getLibrary ${targetPath}`)
    } catch (err) {
      return null
    }
    return targetPath
  }

  getAndroidApproovConfigPath() {
    return path.join(this.dir, 'android', 'app', 'src', 'main', 'assets', 'approov.config')
  }

  hasAndroidApproovConfig() {
    return fsx.isFile(this.getAndroidApproovConfigPath())
  }

  async writingAndroidApproovConfig(targetPath = this.getAndroidApproovConfigPath()) {
    if (!fsx.isDirectory(path.dirname(targetPath))) {
      // is parent assets dir missing?
      const assetsDir = path.dirname(targetPath)
      if ('assets' !== path.basename(assetsDir)) return null
      try {
        const { stdout } = await shell.execAsync(`mkdir ${assetsDir}`)
      } catch (err) {
        return null
      }
    }

    try {
      const { stdout } = await shell.execAsync(`approov sdk -getConfig ${targetPath}`)
    } catch (err) {
      return null
    }
    return targetPath
  }

  getAndroidApproovPropsPath() {
    return path.join(this.dir, 'android', 'app', 'src', 'main', 'assets', 'approov.props')
  }

  hasAndroidApproovProps() {
    return fsx.isFile(this.getAndroidApproovPropsPath())
  }

  async writingAndroidApproovProps(props, targetPath = this.getAndroidApproovPropsPath()) {
    if (!fsx.isDirectory(path.dirname(targetPath))) {
      // is parent assets dir missing?
      const assetsDir = path.dirname(targetPath)
      if ('assets' !== path.basename(assetsDir)) return null
      try {
        const { stdout } = await shell.execAsync(`mkdir ${assetsDir}`)
      } catch (err) {
        return null
      }
    }

    if (!props) return null
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
      fsx.writeFileSync(targetPath, propsStr)
    } catch (err) {
      return null
    }
    return targetPath
  }

  getIosProjectName() {
    if (this.iosProjectName) return this.iosProjectName

    let name = null
    try {
      const iosDir = path.join(this.dir, 'ios')
      const files = fsx.readdirSync(iosDir).filter(fn => fn.endsWith('.xcworkspace'));
      if (files.length == 1) {
        name = path.basename(files[0], '.xcworkspace')
      }
    } catch (err) {}
    if (name) this.iosProjectName = name
    return name
  }

  isIosProject() {
    return !!this.getIosProjectName()
  }
  
  async findingIosDeploymentTarget() {
    const projName = this.getIosProjectName()
    if (!projName) return null
    const pbxFile = path.join(this.dir, 'ios', `${projName}.xcodeproj`, 'project.pbxproj')
    if (!fsx.isFile(pbxFile)) return null

    const minTargetLine = /IPHONEOS_DEPLOYMENT_TARGET\s*=\s*(\d+)\.?(\d*)/
    let minMinor = 0
    let minMajor = 0
    try {
      const lines = new lineByline(pbxFile)
      let line
      while (line = lines.next()) {
        const result = line.toString().match(minTargetLine)
        if (result) {
          const major = parseInt(result[1])
          const minor = parseInt(result[2])
          if (minMajor < major || (minMajor == major && minMinor < minor)) {
            minMajor = major
            minMinor = minor
          }
        }
      }
    } catch (err) {
      return null
    }
    return minMajor > 0 ? `${minMajor}.${minMinor}` : null
  }

  isIosDeploymentTargetSupported(target) {
    if (!target) return false
    try {
      return compareVersions.compare(target, this.specs.iosMinDeploymentTarget, '>=')
    } catch (err) {}
    return false
  }

  getIosApproovSDKPath() {
    return path.join(this.dir, 'node_modules', '@approov', 'react-native-approov', 'ios', 'Approov.framework')
  }

  hasIosApproovSDK() {
    return fsx.isDirectory(this.getIosApproovSDKPath())
  }

  async writingIosApproovSDK(targetPath = this.getIosApproovSDKPath()) {
    if (!fsx.isDirectory(path.dirname(targetPath))) return null

    const zipPath = path.join(path.dirname(targetPath), 'Approov.zip')
    const libID = this.specs.iosLibraryID
    try {
      console.log(`do: approov sdk -libraryID ${libID} -getLibrary ${zipPath}`)
      const { stdout } = await shell.execAsync(`approov sdk -libraryID ${libID} -getLibrary ${zipPath}`)
    } catch (err) {
      console.log(`fetch err: ${err}`)
      try {
        await shell.execAsync(`rm -f ${zipPath}`)
      } catch (err) {}
      return null
    }
    try {
      await shell.execAsync(`rm -rf ${targetPath} && unzip ${zipPath} -d ${path.dirname(zipPath)} && rm -f ${zipPath}`)
    } catch (err) {
      console.log(`err: ${err}`)
      try {
        await shell.execAsync(`rm -f ${zipPath}`)
      } catch (err) {}
      return null
    }

    return targetPath
  }

  getIosApproovConfigPath() {
    const projName = this.getIosProjectName()
    if (!projName) return false

    return path.join(this.dir, 'ios', projName, 'approov.config')
  }

  hasIosApproovConfig() {
    return fsx.isFile(this.getIosApproovConfigPath())
  }

  async writingIosApproovConfig(targetPath = this.getIosApproovConfigPath()) {
    if (!fsx.isDirectory(path.dirname(targetPath))) return null

    try {
      const { stdout } = await shell.execAsync(`approov sdk -getConfig ${targetPath}`)
    } catch (err) {
      return null
    }
    return targetPath
  }

  getIosApproovPropsPath() {
    return path.join(this.dir, 'ios', 'approov.plist')
  }

  hasIosApproovProps() {
    return fsx.isFile(this.getIosApproovPropsPath())
  }

  async writingIosApproovProps(props, targetPath = this.getIosApproovPropsPath()) {
    if (!fsx.isDirectory(path.dirname(targetPath))) return null

    if (!props) return null
    const plistProps = {
      'token.name':    props.tokenName,
      'token.prefix':  props.tokenPrefix,
      'binding.name':  props.bindingName,
      'init.prefetch': props.usePrefetch,
    }
    try {
      plist.writeFileSync(targetPath, plistProps)
    } catch (err) {
      return null
    }
    return targetPath
  }

  async updatingIosPods() {
    try {
      const iosDir = path.join(this.dir, 'ios')
      await shell.execAsync(`cd ${iosDir} && pod install`, {silent:false})
    } catch (err) {
      console.log(err)
      return false
    }
    return true
  }

  async findingIosDeviceBuildDir() {
    const projName = this.getIosProjectName()
    if (!projName) return null

    let buildDir = null
    try {
      const listBuildSettings = `xcodebuild -workspace ios/${projName}.xcworkspace -scheme ${projName} -configuration Debug -showBuildSettings`
      const { stdout, stderr } = await shell.execAsync(listBuildSettings)
      const buildDirLines = stdout.split('\n').filter(line => (line.match('TARGET_BUILD_DIR')))
      if (buildDirLines.length == 1) {
        const buildDirMatch = buildDirLines[0].match(/TARGET_BUILD_DIR\s*=\s*(.*)/)
        if (buildDirMatch && buildDirMatch.length >= 2) buildDir = buildDirMatch[1].trim()
      }
    } catch (err) {}
    return buildDir
  }

  async buildingIosDeviceIpa(targetDir) {
    if (!fsx.isDirectory) return null

    const appName = this.getIosProjectName()
    if (!appName) return null
    const buildDir = await this.findingIosDeviceBuildDir()
    if (!buildDir) return null
    const appDir = path.join(buildDir, `${appName}.app`)
    if (!fsx.isDirectory(appDir)) return null

    const tmpDir = `${targetDir}/tmp-${appName}`
    const zipFile = `${targetDir}/tmp-${appName}.zip`
    const ipaFile = `${targetDir}/tmp-${appName}.ipa`

    // @TODO: do more of this in node rather than all in shell
    try {
      const ipaCreate = [
        `rm -rf ${tmpDir} ${zipFile} ${ipaFile}`,
        `mkdir ${tmpDir}`,
        `cp -r ${appDir} ${tmpDir}/`,
        `zip -9 -r ${zipFile} ${tmpDir}`,
        `mv ${zipFile} ${ipaFile}`,
        `rm -rf ${tmpDir}`,
      ].join(' && ')
      const { stdout, stderr } = await shell.execAsync(`echo ${ipaCreate}`)
    } catch (err) {
      console.log(err)
      try {
        const { stdout, stderr } = await shell.execAsync(`rm -rf ${tmpDir} ${zipFile} ${ipaFile}`)
      } catch (err) {}
      return null
    }

    return ipaFile
  }
}

module.exports = Project
