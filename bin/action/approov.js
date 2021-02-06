const reactNativeMinVersion = '0.60'

const approovVersions = {
  '2.5': {
    name: '2.5',
    reactNativeMinVersion: '0.60',
    androidMinSDK: '18',
    androidLibraryId: '2878',
    iosMinVersion: '10.0',
    iosLibraryId: '4855',      
  },
  '2.6': {
    name: '2.6',
    reactNativeMinVersion: '0.60',
    androidMinSDK: '21',
    androidLibraryId: '3534',
    iosMinVersion: '10.0',
    iosLibraryId: '5851',      
  },
}

const namedVersions = {
  latest   : approovVersions['2.6'],
  '2.5'    : approovVersions['2.5'],
  'v2.5'   : approovVersions['2.5'],
  '2.5.0'  : approovVersions['2.5'],
  'v2.5.0' : approovVersions['2.5'],
  '2.6'    : approovVersions['2.6'],
  'v2.6'   : approovVersions['2.6'],
  '2.6.0'  : approovVersions['2.6'],
  'v2.6.0' : approovVersions['2.6'],
}

const info = {
  reactNativeMinVersion,

  byVersion: (name) => {
    if (!name || !name.trim()) name = 'latest'
    name = name.trim()
    const info = namedVersions[name]
    return info ? { ...info, isSupported:true } : { name, isSupported:false }
  },
}

const readme = "https://github.com/approov/quickstart-react-native/blob/master/README.md"

const fix = {
  reactnativeProject: `${readme}/react-native-project`,
  approovCLI: `${readme}/#approov-cli`,
  approovAPIDomains: `${readme}/#approov-api-domains`,
  approovVersion: `${readme}/# `,
  approovPackage: `${readme}/# `,
  androidTarget: `${readme}/android-target`,
  androidNetworkPermissions: `${readme}/android-network-permissions`,
  androidApproov: `${readme}/#`,
  iOSTarget: `${readme}/#`,
  iOSApproov: `${readme}/#`,
}

module.exports = { info, fix }
