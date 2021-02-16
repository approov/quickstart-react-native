// Configuration

// Approov fun facts by release
const approovReleases = {
  '2.5': {
    sdkVersion: '2.5',
    reactNative: {
      minVersion: '0.60',
    },
    android: {
      sdkLibraryId: '2974',
      minSdk: '18',
    },
    ios: {
      sdkType: 'framework',
      sdkLibraryId: '4855',      
      minDeployTarget: '10.0',
    },
  },
  '2.6': {
    sdkVersion: '2.6',
    reactNative: {
      minVersion: '0.60',
    },
    android: {
      sdkLibraryId: '3534',
      minSdk: '21',
    },
    ios: {
      sdkType: 'framework',
      sdkLibraryId: '5851',      
      minDeployTarget: '10.0',
    },
  },
}

// Approov release aliases
const approovDefaultVersion = 'most-devices'
const approovVersions = {
  'most-devices'  : approovReleases['2.5'],
  '2.5'           : approovReleases['2.5'],
  'v2.5'          : approovReleases['2.5'],
  '2.5.0'         : approovReleases['2.5'],
  'v2.5.0'        : approovReleases['2.5'],
  'latest'        : approovReleases['2.6'],
  'most-security' : approovReleases['2.6'],
  '2.6'           : approovReleases['2.6'],
  'v2.6'          : approovReleases['2.6'],
  '2.6.0'         : approovReleases['2.6'],
  'v2.6.0'        : approovReleases['2.6'],
}

// Default registration expiration
const approovDefaultExpireAfter = '1h'

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
  approovReg: `${readme}#`,
}

// error messages
const errMsgs = {
  noAPK:        apk => `Debug APK not found: ${apk}`,
  failedAPKReg: apk => `Unable to register Android debug APK file: ${apk}`,
  error:        msg => `Error: ${msg? msg:'unspecified'}`,
}


module.exports = { 
  approovReleases,
  approovDefaultVersion,
  approovVersions,
  approovDefaultExpireAfter,
  refs,
  errMsgs,
}
