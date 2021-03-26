<h1 align="center">React-Native Approov Quickstart</h1>
<h2 align="center" style="color:red;">WARNING: THIS PACKAGE IS PRE-RELEASE ONLY</h2>
<p align="center">
<<<<<<< HEAD
    <a href="https://approov.io">
      <img style="margin:0;" src="assets/approov-icon.png" alt=""/>
    </a>
=======
    <img margin-top=".25rem" src="assets/approov-icon.png" alt=""/>
>>>>>>> 5a4f784537ca9f44a7dca5c6a911adf18e4b23d7
    <a href="https://www.npmjs.com/package/@approov/react-native-approov">
      <img alt="npm" src="https://img.shields.io/npm/v/@approov/react-native-approov" />
    </a>
    <a href="https://github.com/approov/quickstart-react-native/issues?q=is%3Aopen+is%3Aissue">
      <img alt="GitHub issues" src="https://img.shields.io/github/issues-raw/approov/quickstart-react-native" />
    </a>
    <a href="https://approov.io/docs">
      <img alt="Approov docs" src="https://img.shields.io/badge/approov-docs-blue" />
    </a>
<<<<<<< HEAD
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
=======
    <img src="assets/react-icon.png" alt=""/>
</p>
<p align="center">
  <a href="#Basic Usage">Usage</a> •
  <a href="#Requirements and Setup">Requirements</a> •
  <a href="#Approov Integration">Approov Integration</a> •
  <a href="#Common Scenarios">Common Scenarios</a> •
  <a href="#Release Notes">Release Notes</a>
>>>>>>> 5a4f784537ca9f44a7dca5c6a911adf18e4b23d7
</p>

---

The React Native Approov Quickstart provides an easy integration of Approov API threat protection into most React Native apps.

You will learn how to:

- Check that your React Native app meets the minimum requirements for Approov integration,
- Integrate Approov into your app
- Register and successfully deploy your app oonto Android and iOS devices

Start with your own React Native app or try one of the available examples.

## Basic Usage

### 0. Check that your development environment is properly set up

Make sure you have recent versions of `node` with `npx`, and `yarn` installed on your machine.

For iOS, make sure `xcode` and the xcode command line tools are installed, as well as `ios-deploy` (which may come with react-native).

For Android, make sure Android Studio is installed.

For Approov, make sure you have installed and can run the `approov` CLI tool. See the
[Approov installation instructions](https://approov.io/docs/latest/approov-installation/) for more detail.

### 1. Start with a working React Native app

Start with a working react native app. If you do not have one, you may install an example from the 
`@approov/react-native-approov` package. We'll use the `shapes_fetch` example in our instructions. To install it, do:

```
$ npx @approov/react-native-approov example
✔ Select example app to copy › shapes_fetch
✔ Specify destination path … .
✔ Created shapes-fetch example.
ℹ Installing shapes-fetch npm dependencies...```
```

To test the app with Android, change into the example directory and run android:

```
$ cd shapes_fetch
$ react-native run-android
```

To test the app on iOS, change into the example directory and run iOS:

```
$ cd shapes_fetch
$ react-native run-ios
```

You should see a running Approov Shapes app on an android emulator without Approov installed.

### 2. Integrate Approov into the app

Next, we'll run the `check` command too see if the app is ready for Approov integration.

```
$ npx @approov/react-native-approov check
   
✔ Found project.json in /Users/skiph/projects/rn-quickstart/playground/tmp/shapes_fetch.
✔ Using Approov version 2.6.
✔ Found React Native version 0.63.4.
✔ Found active Approov CLI.
ℹ Approov is currently protecting these API domains:
ℹ   approov.io                 type:account, alg:HS256
ℹ   shapes.approov.io          type:restricted, alg:HS256
ℹ   shipfast.skiph.approov.io  type:account, alg:HS256
ℹ   test.maplerise.com         type:account, alg:HS256
ℹ To add or remove API domains, see https://github.com/approov/quickstart-react-native/blob/master/README.md#approov-api-domains.
✔ Found @approov/react-native-approov package
✔ Found Android project.
✖ Found Android minimum SDK 18; >= 21 required.
ℹ See https://github.com/approov/quickstart-react-native/blob/master/README.md#android-project for help.
✔ Found required Android network permissions.
✔ Found Android Approov SDK.
✔ Found Android Approov config file.
✔ Found Android Approov properties file.
✔ Found iOS project.
✔ Found iOS deployment target 10.0.
✔ Found iOS Approov SDK.
✔ Found iOS Approov config file.
✔ Found iOS Approov properties file.
   
✖ Found 1 error, 0 warnings
```

Fix any errors, and then proceed to the integration step:

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

### Run and verify your Approoov integrated app

#### Android

And once that's completed, rerun android:

```
$ react-native run-android
```

You will see that Approov is now installed, but the API calls are failing because Approov is not registered.

You can view approov-relevant logging info using logcat, similar to this:

```
$ adb logcat | grep -i approov
```

The `react-native-approov` package adds a debug registration command `reg-android` to the react native cli.
Register your app, wait 30 seconds or so, and rerun your app:

```
$react-native reg-android
yarn run v1.22.5
$ /Users/skiph/projects/rn-quickstart/playground/shapes-fetch/node_modules/.bin/react-native reg-android
✔ Found Approov CLI.
✔ Found Approov management token.
✔ Registered debug app for 1h:
registering app Shapes
0ryxGWdWRXGcFJO26vqV9dJzU5Fo/XZ81ccF9ihK9mg=com.shapes-1.0[1]-2974  SDK:Android(2.5.0)
registration successful, expires 2020-12-31 00:59:04
✨  Done in 4.76s.
$ // wait 30 seconds...
$ yarn react-native run-android
```

You should now see your react native app, protected by Approov, successfully making API calls.

If the app is still blocking API calls, you can relaunch the app pr wait 5 minutes for new tokens to be issued.

#### iOS

On iOS, Approov only attests successfully when running on a physical device and not using the interactive packager. So, on iOS, plug in a device and do:

```
$ react-native run-ios --device
```

to build and run your app on a device. Then register the iOS device app by:

```
$ react-native reg-ios
```

Finally, to run your app on a device without the packager, do:

```
$ react-native deploy-ios
```

This will install the app on your device. Launch the app, and Approov should be protecting APi calls from the app.

## Requirements and Setup

### Development Environment

Follow the recommended React Native setup for your host OS and target platform at [https://reactnative.dev/docs/environment-setup](https://reactnative.dev/docs/environment-setup).

The `react-native-approov` command line tools use both `npx` and `yarn`. `npx` is installed with your `node` environment. Please ensure that `yarn 1 (classic)` is installed. See [https://www.npmjs.com/package/yarn](https://www.npmjs.com/package/yarn).

For Android, no additional tooling is required.

For iOS, the `ios-deploy` command is required to deploy app archives onto iOS devices. TYpically, this utility can be installed using `brew install ios-deploy`. See [https://github.com/ios-control/ios-deploy](https://github.com/ios-control/ios-deploy) for more information.

###App Requirements

####Javascript

XHR compliant network calls

currently no explicit expo support

#### Android Requirements

using normal app setup (cra compatible)

minsdk requirements

network permissions

#### iOS Requirements

normal workspace structure (cra compatible)

scheme matches workspace name

flipper not supported - disable

signing and provisioning set for device operation

if bitcode required, enabled in workspace

#### Approov Requirements

Active Approov Account

sign up for free trial here

CLI Access w/ developer permissions

Enabled using roles or management tokens

Approov API Domains

set independently; requires admin privileges

## Approov Integration

### React-Native-Approov Commands

all run by npx @approov... or after APproov package installed, using yarn run ...

#### example

#### check

checks requirements are met

#### integrate

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

### Updating Android min SDK

### Updating Android Network Permissions

### Running in an Android Emulator

### Disabling Flipper on iOS

### Running on an iOS simulator

### Running on an iOS device

### Using Bitcode with iOS

### Customizing Approov Token Passing

### Prefetching an Approov Token at Launch

### Binding Authorization to Approov Tokens

### Which Javascript Network Libraries are supported?

### Handling Network Errors

### Why apps launched with run-ios apps fail to attest properly

### Next Steps with Approov

### Troubleshooting Approov Rejections

(what if I don;t get shapes)

### Contact Support

submit an issue (bugs or feature requests)

ask a question

getting access to approov

## Release Notes

### Version 1.x

### Version 2.x

### Feature Requests

### License

---
