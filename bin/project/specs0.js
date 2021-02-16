// Approov specific specifications

const chalk = require("chalk")

// Approov fun facts by release
const approovReleases = {
  '2.5': {
    version: '2.5',
    reactNativeMinVersion: '0.60',
    androidMinSDK: '18',
    androidLibraryID: '2974',
    iosMinDeploymentTarget: '10.0',
    iosLibraryID: '4855',      
  },
  '2.6': {
    version: '2.6',
    reactNativeMinVersion: '0.60',
    androidMinSDK: '21',
    androidLibraryID: '3534',
    iosMinDeploymentTarget: '10.0',
    iosLibraryID: '5851',      
  },
}

// Approov release aliases
const versions = {
  latest   : approovReleases['2.5'],
  '2.5'    : approovReleases['2.5'],
  'v2.5'   : approovReleases['2.5'],
  '2.5.0'  : approovReleases['2.5'],
  'v2.5.0' : approovReleases['2.5'],
  '2.6'    : approovReleases['2.6'],
  'v2.6'   : approovReleases['2.6'],
  '2.6.0'  : approovReleases['2.6'],
  'v2.6.0' : approovReleases['2.6'],
}

// help references
const readme = "https://github.com/approov/quickstart-react-native/blob/master/README.md"
const refs = {
  reactNativeProject: chalk.blue(`${readme}/react-native-project`),
  approovCLI: chalk.blue(`${readme}/#approov-cli`),
  approovAPIDomains: chalk.blue(`${readme}/#approov-api-domains`),
  approovVersion: chalk.blue(`${readme}/# `),
  approovPackage: chalk.blue(`${readme}/# `),
  androidProject: chalk.blue(`${readme}/android-project`),
  androidNetworkPermissions: chalk.blue(`${readme}/android-network-permissions`),
  androidApproov: chalk.blue(`${readme}/#`),
  iosProject: chalk.blue(`${readme}/#`),
  iosApproov: chalk.blue(`${readme}/#`),
  contactSupport: chalk.blue(`${readme}/#`),
}

// error names
const errors = {
  noAPK: { name: 'noAPK', msg: apk => `Debug APK not found: ${apk}` },
  error: { name: 'error', msg: msg => `Error: ${msg? msg:'unspecified'}`,
}

// provide error object for id and message params
const errorForID(id, ...params) = id => {
  if (id in errors) {
    return {
      name: errors[id].name,
      message: errors[id].msg(...params),
    }
  } else {
    return {
      name: errors[error].name,
      message: errors[error].msg(...params),
    }
  }
}

// provide release info by version
const forApproovVersion = (version) => {
  if (!version || !version.trim()) version = 'latest'
  version - version.trim()
  const info = versions[version]
  return info ? { ...info, isSupported:true, refs } : { version, isSupported:false, refs }
}

module.exports = { 
  forApproovVersion, 
  errorForID,
  help: refs,
}
