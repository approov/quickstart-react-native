# react-native-approov

## WARNINGS

**This package is under active development.**
**Android support is being tested.**

**iOS support is not complete.**

## Basic Usage

### 0. Basic Requirements

Make sure you have recent versions of `node`, `npx`, and `yarn` installed on your machine.

Ensure you have an active Approov account and set the environmental variable `APPROOV_MANAGEMENT_TOKEN` to
your account's management token string and have a recent `approov` CLI installed. See the
[Approov installation instructions](https://approov.io/docs/latest/approov-installation/) for more detail.

Verify your setup by calling the `react-native-approov` package `whoami` command:

```
$ npx @approov/react-native-approov whoami
✔ Found Approov CLI.
✔ Found Approov management token.
✔ Verified Approov management token:
    account: cb-skiph
    userName: skiph (administration)
    expiry: 2046-12-17 08:08:24
```

### 1. Working React Native App

Start with a working react native app. As an example, we'll use an example from the `react-native-approov` package:

```
$ npx @approov/react-native-approov example
✔ Select example app to copy › shapes-fetch
✔ Specify destination path … .
✔ Created shapes-fetch example.
ℹ Installing shapes-fetch npm dependencies...```
```

Then change into the example directory and run android:

```
$ cd shapes-fetch
$ yarn react-native run-android
```

You should see a running Approov Shapes app on an android emulator without Approov installed.

### 2. Approov Integration

Next, we'll run the interactive `integrate` command. This will update the Approov initial config to protect
any new API domains (for `shapes-fetch`, the API domain is `shapes.approov.io`), and it will add the Approov
package and required modifications to the project.

Currently, there are issues in the integration command with adding the approov package and new domains, so 
we will do those steps first for now:

```
$ approov api -add shapes.approov.io
$ yarn add @approov/react-native-approov
```

Now, run the `integrate` command:

```
$ npx react-native-approov integrate
✔ Found Approov CLI.
✔ Verified Approov management token.
✔ Found @approov/react-native-approov package
✔ Fetched current Approov-protected API domains
✔ Specify comma-separated list of API domains to protect … approov.io, shapes.approov.io, shipfast.skiph.approov.io
✔ Specify Approov token header name … Approov-Token
✔ Specify prefix to add to the Approov token string, if any …
✔ Specify binding header data name, if any …
✔ Specify prefix to remove from the binding data string, if any … Bearer
✔ Fetched current Approov config string
✔ Created Approov props file
⠸ Fetching Approov Android SDK library
✔ Fetched current Approov Android SDK library
✔ Synced Approov config string 'android/app/src/main/assets/approov.config'
✔ Synced Approov props file 'android/app/src/main/assets/approov.props'
✔ Synced Approov SDK library 'node_modules/@approov/react-native-approov/android/libs/approov.aar'
✔ Integration completed successfully.
```

And once that's completed, rerun android:

```
$ yarn react-native run-android
```

You will see that Approov is now installed, but the API calls are failing because Approov is not registered.

You can view approov-relevant logging info using logcat, similar to this:

```
$ adb logcat | grep -i approov
```

The `react-native-approov` package adds a debug registration command `reg-android` to the react native cli.
Register your app, wait 30 seconds or so, and rerun your app:

```
$ yarn react-native reg-android
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

You should now see your react native app, protecteed by Approov, successfully making API calls.

If the app is still blocking API calls, you can relaunch the app pr wait 5 minutes for new tokens to be issued.

## The `react-native-approov` Commands

```
$ npx react-native-approov -V
2.1.2
Skips-MacBook-Pro:shapes-fetch skiph$ npx react-native-approov
Usage: react-native-approov [options] [command]

Options:
  -V, --version                  output the version number
  -h, --help                     display help for command

Commands:
  check                          Check Approov integration in the current app
  example [options] [app] [dir]  Copy a quickstart example app into a new directory
  integrate [options]            Integrate Approov into the current app
  sync [srcDir]                  Synchronize app using saved Approov integration files
  whoami                         Verify Approov account
  help [command]                 display help for command
```

## The `react-native reg-android` Command

```
$ npx react-native reg-android --help
react-native reg-android

register android debug APK

Options:
  --expireAfter <duration>  expire registration after duration (default: "1h")
  -h, --help                output usage information

Example usage:
  register android debug APK for 1 hour (default):
  react-native reg-android

  register android debug APK for 1 year, 2 days, 3 hours, and 4 minutes:
  react-native reg-android --expireAfter 1y2d3h4m
  ```

## React Native Approov Checks

The check program will check that yoour project meets APproov requiremenest.

### Check help item here