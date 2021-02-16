// Constants

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
const approovVersions = {
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

// reference links
const readme = 'https://github.com/approov/quickstart-react-native/blob/master/README.md'
const refs = {
  contactSupport: `${readme}#`,
  reactNativeProject: `${readme}#react-native-project`,
  approovCLI: `${readme}#approov-cli`,
  approovAPIDomains: `${readme}#approov-api-domains`,
  approovVersion: `${readme}# `,
  approovPackage: `${readme}# `,
  androidProject: `${readme}#android-project`,
  androidNetworkPermissions: `${readme}#android-network-permissions`,
  androidApproov: `${readme}#`,
  iosProject: `${readme}#`,
  iosApproov: `${readme}#`,
}

// error messages
const errors = {
  noAPK: apk => `Debug APK not found: ${apk}`,
  failedAPKReg: apk => `Unable to register Android debug APK file: ${apk}`,
  error: msg => `Error: ${msg? msg:'unspecified'}`,
}


module.exports = { 
  approovReleases,
  approovVersions,
  refs,
  errors,
}
