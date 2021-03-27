<h1 align="center">React-Native Approov Quickstart</h1>
<h2 align="center" style="color:red;">WARNING: THIS PACKAGE IS PRE-RELEASE ONLY</h2>
<p align="center">
    <a href="https://approov.io">
      <img style="margin:0;" src="assets/approov-icon.png" alt=""/>
    </a>
    <a href="https://www.npmjs.com/package/@approov/react-native-approov">
      <img alt="npm" src="https://img.shields.io/npm/v/@approov/react-native-approov" />
    </a>
    <a href="https://github.com/approov/quickstart-react-native/issues?q=is%3Aopen+is%3Aissue">
      <img alt="GitHub issues" src="https://img.shields.io/github/issues-raw/approov/quickstart-react-native" />
    </a>
    <a href="https://approov.io/docs">
      <img alt="Approov docs" src="https://img.shields.io/badge/approov-docs-blue" />
    </a>
    <a href="https://reactnative.dev">
      <img style="margin:0;" src="assets/react-icon.png" alt=""/>
    </a>
</p>
<p align="center">
  <a href="#basic-usage">Usage</a> •
  <a href="#requirements-and-setup">Requirements</a> •
  <a href="#approov-integration">Approov Integration</a> •
  <a href="#common-scenarios">Common Scenarios</a> •
  <a href="#release-notes">Release Notes</a>
</p>

---

The React Native Approov Quickstart provides an easy integration of Approov API threat protection into most React Native apps.

You will learn how to:

- Check that your React Native app meets the minimum requirements for Approov integration,
- Integrate Approov into your app without no additional code required,
- Register and successfully deploy your app onto Android and iOS devices.

Start with your own React Native app or try one of the available examples.

## Basic Usage

### 0. Check that your development environment is properly set up

Ensure that you have a recent version of `React Native` (>= 0.60) installed (see [installing react native](https://reactnative.dev/docs/environment-setup)). You also need `yarn` classic (1.x) (see [installing yarn](https://www.npmjs.com/package/yarn). If you can build the default `react-native init` app, your React Native environment is all set up. 

For Android, you will also want access to `adb` for identifying device IDs and running `logcat` (see [Android Debug Bridge (adb)](https://developer.android.com/studio/command-line/adb). For iOS, you should also install `ios-deploy` to run on iOS devices (see [installing ios-deploy](https://github.com/ios-control/ios-deploy)).

For Approov, make sure you have installed and can run the `approov` CLI tool (see [installing Approov](https://approov.io/docs/latest/approov-installation/)). If you do not have access to Approov, you can sign up for a free trial at [https://www.approov.io/signup](https://www.approov.io/signup).

Refer to [development requirements and set up](#requirements-and-setup) for additional details.

### 1. Start with a working React Native app

You can start with any React Native app using the standard (non-expo) runtime and standard react-native networking (fetch, axios, frisbee...).
Start with your own React Native app, or use one of the Approov-provided examples.

We will use the Approov `shapes_fetch` example to illustrate the remaining steps to integrate Approov into a simple React Native app. To copy a pre-packaged example, start a command-line terminal, run the `react-native-approov example` command, and select an example and directory to install into:

```
$ npx @approov/react-native-approov example
✔ Select example app to copy › shapes_fetch
✔ Specify destination path … .
✔ Created shapes-fetch example.
ℹ Installing shapes-fetch npm dependencies...```
```

The example react-native project is downloaded, npm packages are installed, and, on iOS, pod dependencies are also installed. The above output was elided for brevity.

To test the app on Android, change into the `shapes_fetch` directory and run android:

```
$ cd shapes_fetch
$ yarn run react-native run-android
```

Or to test the app on iOS, run iOS from the same `shapes_fetch` directory:

```
$ cd shapes_fetch
$ yarn run react-native run-ios
```

You should see a running Approov Shapes app running on either an Android emulator or iOS simulator. This is a plain React Native app; Approov is not installed.

Note, depending on your exact React Native environment, you may have to pre-launch the Android emulator or iOS simulator, and you may need to restart Metro package server if it was previously running in a different project directory - the usual React Native idiosyncrasies.

![Initial App Screens](assets/basic-screens.png)

There are two buttons on the app. Pressing `check` will call the `shapes.approov.io`server's unprotected hello endpoint  `/v2/hello`, and this should succeed. The `shape` button requests a random shape from the Approov-protected `/v2/shapes` endpoint. This should not succeed because the API call is being made from an App not recognized by Approov.

The Shapes start up, successful hello API call, and unsuccessful shapes API call screens are shown above.

### 2. Integrate Approov into your app

We'll start Approov integration by running the `react-native-approov check` command to see if the app is ready for integration.

Here's a sample Android check:

```
$ npx @approov/react-native-approov check
   
✔ Found project.json in /Users/skiph/projects/quickrn/play/shapes_fetch.
✔ Found yarn in PATH.
✔ Found React Native version 0.64.0.
✔ Found Approov CLI with active session.
ℹ Approov is currently protecting these API domains:
ℹ   shapes.approov.io
ℹ To add or remove API domains, see https://approov.io/docs/latest/approov-usage-documentation/#managing-api-domains
ℹ The @approov/react-native-approov package is not installed
✔ Found Android project.
✔ Found Android minimum SDK 21.
✔ Found required Android network permissions.
✔ Found iOS project.
✔ Found iOS workspace - shapes_fetch
✔ Found iOS deployment target 10.0.
   
✔ Approov check completed successfully
```

Watch for a few things:

1. The `check` command requires an active Approov session. See [Establishing an active Approov session](#establishing-an-active-approov-session) if you encounter a missing Approov session error.

2. Once you have an active Approov session, the `check` command will show API domains registered to your Approov service. Make sure all API domains called by your app which require API protection are registered with Approov. In our shapes example, all `shapes.approov.io` endpoints will be protected. In case you are wondering, although the '/hello' endpoint is protected by Approov, the shapes server chooses to respond to any '/hello' API call whether the caller appears valid or not.

3. Fix any errors reported by the `check` command. Approov often requires a few version updates or extra permissions. On Android, for example, the minimum SDK is 21, and the additional `ACCESS_NETWORK_STATE` permission is required. Look up reported errors in the [common scenarios](#common-scenarios) section or follow help links included in the command output.

Once all issues are fixed, you should rerun your app to verify it is working as before. You are now ready to integrate Approov.

Run the `react-native-approov integrate` command. It will prompt you to make some choices such as the name of the Approov header field and whether to bind authorization and approov tokens. Some of these values require coordination with your backend service. Refer to the [react-native-approov integrate command](#react-native-approov-integrate) for all options.

In our shapes example, just accept all the default options.

```
$ npx @approov/react-native-approov integrate
   
✔ Found project.json in /Users/skiph/projects/rn-quickstart/playground/tmp/shapes_fetch.
✔ Using Approov version 2.6.
✔ Found React Native version 0.63.4.
✔ Found active Approov CLI.
ℹ Approov is currently protecting these API domains:
ℹ   approov.io                 type:account, alg:HS256
ℹ   shapes.approov.io          type:restricted, alg:HS256
ℹ To add or remove API domains, see https://github.com/approov/quickstart-react-native/blob/master/README.md#approov-api-domains.
✔ Specify Approov token header name … Approov-Token
✔ Specify prefix to add to the Approov token string, if any … 
✔ Specify binding header data name, if any … 
✔ Start token prefetch during app launch? … no / yes
  Installing the @approov/react-native-approov package...
yarn add v1.22.5
[1/4] Resolving packages...
✔ Installed @approov/react-native-approov package
  Installing Android Approov SDK library...
Android SDK library 2.6.0(3534) written to /Users/skiph/projects/rn-quickstart/playground/tmp/shapes_fetch/node_modules/@approov/react-native-approov/android/libs/approov.aar
✔ Installed Android Approov SDK library.
  Installing Android Approov config file...
initial SDK configuration written to /Users/skiph/projects/rn-quickstart/playground/tmp/shapes_fetch/android/app/src/main/assets/approov.config
✔ Installed Android Approov config file.
✔ Installed Android Approov props file.
  Installing iOS Approov SDK library...
approov sdk -libraryID 5851 -getLibrary /Users/skiph/projects/rn-quickstart/playground/tmp/shapes_fetch/node_modules/@approov/react-native-approov/ios/Approov.zip
iOS device SDK library 2.6.0(5851) written to /Users/skiph/projects/rn-quickstart/playground/tmp/shapes_fetch/node_modules/@approov/react-native-approov/ios/Approov.zip
Archive:  /Users/skiph/projects/rn-quickstart/playground/tmp/shapes_fetch/node_modules/@approov/react-native-approov/ios/Approov.zip
✔ Installed iOS Approov SDK library.
  Installing iOS Approov config file...
initial SDK configuration written to /Users/skiph/projects/rn-quickstart/playground/tmp/shapes_fetch/node_modules/@approov/react-native-approov/ios/approov.config
✔ Installed iOS Approov config file.
✔ Installed iOS Approov props file.
  Updating iOS pods...
Auto-linking React Native module for target `shapes_fetch`: react-native-approov
Analyzing dependencies
Downloading dependencies
Generating Pods project
Integrating client project
Pod installation complete! There are 29 dependencies from the Podfile and 28 total pods installed.
✔ Updated iOS pods.
   
✔ Integration completed successfully
```

### 3. Register and run your Approov-protected app

WIth Approov integrated, it's time to run your app and register it with your Approov service.

The newly integrated apps will run on the Android emulator or iOS simulator you used before, but default Approov security policies require API calls to be made from physical devices. Even though Approov is properly integrated, protected APi calls made from an emulator or simulator will not succeed. Refer to [Running on an Android emulator](#running-on-an-android-emulator) or [Running on an iOS simulator](#running-on-an-ios-simulator) for instructions on how to workaround this, if desired, during development.

For our shapes example, we will switch to physical devices to check that Approov is truly protecting our API calls. Follow the instructions below for running on Android and iOS devices.

#### Android Devices

Connect a physical Android device to your host platform over USB. See [Run apps on a hardware device](https://developer.android.com/studio/run/device) for full instructions. 

To explicitly specify the device, determine the device id, by running `adb devices`, and run React Native on Android using the `--deviceid` flag:

```
$ yarn run react-native run-android --deviceId 7890PQR
```

Approov is now integrated, but the fetch shapes API calls are still failing because the app is not registered with Approov and appears as an untrusted API client.

You can view javascript logging within the metro server terminal, or view the Android logcat for more details.

To register the Android app with Approov, the `react-native-approov` package adds a convenient registration command `reg-android` to the normal react native command line interface.

```
$ yarn run react-native reg-android
yarn run v1.22.5
✔ Found Approov CLI.
✔ Found Approov management token.
✔ Registered debug app for 1h:
registering app Shapes
0ryxGWdWRXGcFJO26vqV9dJzU5Fo/XZ81ccF9ihK9mg=com.shapes-1.0[1]-2974  SDK:Android(2.5.0)
registration successful, expires 2020-12-31 00:59:04
✨  Done in 4.76s.
```

By default, the `debug` variant is registered with Approov for one hour, useful for debug and testing.

The app will be recognized by Approov within five minutes. Relaunch the app will normally trigger immediate recognition. When successful, you should see that pressing the `fetch` button returns random shapes as the Shapes app running on your device is now being recognized as an authentic registered app by the Shapes service.

![Android Shapes](assets/shapes-android.png)

Congratulations oon successfully protecting your API calls with Approov!

#### iOS Devices

Connect a single iOS device to your host platform over USB. See [Run an Appon a device](https://help.apple.com/xcode/mac/current/#/dev5a825a1ca) for setup instructions. Note that you must set up a development team to set up code signing and establish teh device provisioning profile.

Once set, run React Native on Android with an extra `--device` flag:

```
$ yarn run react-native run-ios --device
```

Approov is now integrated, but the 'fetch' shapes API calls are still failing because the app is not registered with Approov and appears as an untrusted API client.

You can view javascript logging within the Metro server, or view more detailed logging on iOS.

To register the iOS app with Approov, the `react-native-approov` package adds a convenient registration command `reg-ios` to the normal react native command line interface.

```
$ yarn run react-native reg-ios
yarn run v1.22.5
✔ Found Approov CLI.
✔ Found Approov management token.
✔ Registered debug app for 1h:
registering app Shapes
0ryxGWdWRXGcFJO26vqV9dJzU5Fo/XZ81ccF9ihK9mg=com.shapes-1.0[1]-2974  SDK:Android(2.5.0)
registration successful, expires 2020-12-31 00:59:04
✨  Done in 4.76s.
```

By default, the `Debug` configuration is registered with Approov for one hour, useful for debug and testing.

The app will be recognized by Approov within five minutes. Unfortunately, rerunning the app with the `run-ios` command will not work because it uses the `lldb` debugger to launch the app, and the default Approov security policy will block an app running in a debugger from making prootected API calls. Instead, run the `deploy-ios` command:

```
$ yarn run react-native deploy-ios
```

This will deploy but not launch the app. Launch the app by hand on your device, and you should see successful `fetch` shapes calls:

![iOS Shapes](assets/shapes-ios.png)

Congratulations oon successfully protecting your API calls with Approov!

## Requirements and Setup

### Development Environment

The `react-native-approov` command line tools use `node`, `npx` and `yarn`. `npx` is installed with your `node` environment. Please ensure that `yarn 1 (classic)` is installed. See [https://www.npmjs.com/package/yarn](https://www.npmjs.com/package/yarn).

Follow the recommended React Native setup for your host OS and target platform at [https://reactnative.dev/docs/environment-setup](https://reactnative.dev/docs/environment-setup). React Native should be at version 0.60; the latest version is recommended.

For Android, no additional tooling is required.

For iOS, the `ios-deploy` command is required to deploy app archives onto iOS devices. TYpically, this utility can be installed using `brew install ios-deploy`. See [https://github.com/ios-control/ios-deploy](https://github.com/ios-control/ios-deploy) for more information.

### App Requirements

#### Javascript

XHR compliant network calls

currently no explicit expo support

#### Android

using normal app setup (cra compatible)

minsdk requirements

network permissions

#### iOS

normal workspace structure (cra compatible)

scheme matches workspace name

flipper not supported - disable

signing and provisioning set for device operation

if bitcode required, enabled in workspace

### Approov Requirements

As mentioned elsewhere...

Active Approov Account

sign up for free trial here

CLI Access w/ developer permissions

Enabled using roles or management tokens

Approov API Domains set by admin

set independently; requires admin privileges

## Approov Integration

### React-Native-Approov Commands

all run by npx @approov... or after APproov package installed, using yarn run ...

#### react-native-approov example

#### react-native-approov check

checks requirements are met

#### react-native-approov integrate

properties

bitcode (ios only)

### React-Native Plugin Commands

extend the basic react-native commands

#### reg-android
#### reg-ios
#### deploy-ios

### Manual Integration

WHy? if your project has unusual structure or wish to make changes without running a full reintegration

#### Install Approov package

#### Install Android files

#### Install iOS files

## Common Scenarios

These are scenarios you may encounter whne inetgarting Approoov into your app.

### Establishing an active Approov session

....

### Checking and Updating Approov-protected API domains

....

### Updating Android min SDK

....

### Updating Android Network Permissions

....

### Running on an Android Emulator

....

### Disabling Flipper on iOS

....

### Running on an iOS simulator

....

### Running on an iOS device

....

### Using Bitcode with iOS

....

### Customizing Approov Token Passing

....

### Prefetching an Approov Token at Launch

....

### Binding Authorization to Approov Tokens

....

### Which Javascript Network Libraries are supported?

....

### Handling Network Errors

....

### Why apps launched with run-ios apps fail to attest properly

....

### Next Steps with Approov

....

### Troubleshooting Approov Rejections

(what if I don't get shapes)

### Contact Support

submit an issue (bugs or feature requests)

ask a question

getting access to approov

## Release Notes

### Version 1.x

....

### Version 2.x

....

### Feature Requests

....

### License

![GitHub](https://img.shields.io/github/license/approov/quickstart-react-native)

Copyright © 2021 CriticalBlue, Ltd.

---
