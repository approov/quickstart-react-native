# react-native-approov

## WARNINGS

**This package is under beta.**
**Android and iOS support are being tested.**

## Basic Usage

### 0. Basic Requirements

Make sure you have recent versions of `node` with `npx`, and `yarn` installed on your machine.

For iOS, make sure `xcode` and the xcode command line tools are installed, as well as `ios-deploy` (which may come with react-native).

For Android, make sure Android Studio is installed.

For Approov, make sure you have installed and can run the `approov` CLI tool. See the
[Approov installation instructions](https://approov.io/docs/latest/approov-installation/) for more detail.

### 1. Working React Native App

Start with a working react native app. If you do not have one, you may install an example from the 
`@approov/react-native-approov` package. We'll use the `shapes_feetch` example in our instructions. To install it, do:

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

### 2. Approov Integration

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
$ npx react-native-approov integrate
   
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

### Android

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

### iOS

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

This will install the app on your device. Launch teh app, and Approov should be protecting APi calls from teh app.

## React-Native and Approov Topics

### Topic 1

- various topics, some of which are referenced in the command output...

And much more...
