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
    defaultConfiguration: 'Debug',
  },
  reg: {
    defaultExpireAfter: '1h',
  }
}

// reference links
const faq = 'https://github.com/approov/quickstart-react-native/blob/main/FAQ.md'
const apiProtection = 'https://github.com/approov/quickstart-react-native/blob/main/API-PROTECTION.md'
const refs = {
  contactSupport: `${faq}#getting-additional-help`,
  devEnviron: `${faq}#check-that-your-development-environment-is-properly-set-up`,
  reactNativeApp: `${faq}#start-with-a-working-react-native-app`,
  integrateApproov: `${faq}#integrate-approov-into-your-app`,
  registeringApps: `${apiProtection}#registering-apps`,
  approovSession: `${faq}#establishing-an-active-approov-session`,
  apiDomains: `${faq}#checking-and-updating-approov-protected-api-domains`,
  androidMinSdk: `${faq}#updating-android-minimum-sdk`,
  androidNetworkPermission: `${faq}#updating-android-network-permissions`,
  androidEmulator: `${faq}#running-on-an-android-emulator`,
  iosDeployTarget: `${faq}#changing-your-deployment-target-on-ios`,
  iosFlipper: `${faq}#disabling-flipper-on-ios`,
  iosSimulator: `${faq}#running-on-an-ios-simulator`,
  iosDevice: `${faq}#running-on-an-ios-device`,
  iosOther: `${faq}#other-ios-considerations`,
  nodeSnap: `${faq}#integration-may-fail-on-linux-when-node-installed-as-a-snap-package`,
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
