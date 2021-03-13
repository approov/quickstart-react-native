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

// Approov-related specs
const specs = {
  reactNative: {
    minVersion: '0.60',
  },
  android: {
    minSdk: '21',
  },
  ios: {
    minDeployTarget: '10.0',
    useBitcode: false,
  },
  reg: {
    expireAfter: '1h',
  }
}

// Default registration expiration

// reference links
const readme = 'https://github.com/approov/quickstart-react-native/blob/master/README.md'
const refs = {
  contactSupport: `${readme}#`,
  reactNativeProject: `${readme}#react-native-project`,
  approovCLI: `${readme}#approov-cli`,  
  approovAPIDomains: `https://approov.io/docs/latest/approov-usage-documentation/#managing-api-domains`,
  approovPackage: `${readme}# `,
  androidProject: `${readme}#android-project`,
  androidApproov: `${readme}#android-approov`,
  iosProject: `${readme}#ios-project`,
  iosApproov: `${readme}#ios-approov`,
  approovReg: `${readme}#approov-reg`,
}

// error messages
const errMsgs = {
  noAPK:        apk => `Debug APK not found: ${apk}`,
  failedAPKReg: apk => `Unable to register Android debug APK file: ${apk}`,
  error:        msg => `Error: ${msg? msg:'unspecified'}`,
}


module.exports = { 
  specs,
  refs,
  errMsgs,
}
