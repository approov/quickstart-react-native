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
    networkPermissions: ['android.permission.INTERNET', 'android.permission.ACCESS_NETWORK_STATE'],
    defaultVariant: 'debug',
  },
  ios: {
    minDeployTarget: '10.0',
    useBitcode: false,
    defaultConfiguration: 'Debug',
  },
  reg: {
    defaultExpireAfter: '1h',
  }
}

// Default registration expiration

// reference links
const readme = 'https://github.com/approov/quickstart-react-native'
const refs = {
  contactSupport: `${readme}#getting-additional-help`,
  devEnviron: `${readme}#0-check-that-your-development-environment-is-properly-set-up`,
  reactNativeApp: `${readme}#1-start-with-a-working-react-native-app`,
  integrateApproov: `${readme}#2-integrate-approov-into-your-app`,
  runRegAndroidApp: `${readme}#android-devices`,
  runRegIosApp: `${readme}#ios-devices`,
  approovSession: `${readme}#establishing-an-active-approov-session`,
  apiDomains: `${readme}#checking-and-updating-approov-protected-api-domains`,
  androidMinSdk: `${readme}#updating-android-minimum-sdk`,
  androidNetworkPermission: `${readme}#updating-android-network-permissions`,
  androidEmulator: `${readme}#running-on-an-android-emulator`,
  iosDeployTarget: `${readme}#changing-your-deployment-target-on-ios`,
  iosFlipper: `${readme}#disabling-flipper-on-ios`,
  iosSimulator: `${readme}#running-on-an-ios-simulator`,
  iosDevice: `${readme}#running-on-an-ios-device`,
  iosOther: `${readme}#other-ios-considerations`,
  cmdIntegrate: `${readme}#react-native-approov-integrate`,
  nodeSnap: `${readme}#integration-may-fail-on-linux-when-node-installed-as-a-snap-package`,
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
