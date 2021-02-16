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
