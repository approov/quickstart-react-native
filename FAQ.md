<h1 align="center">Approov React-Native Quickstart FAQ</h1>
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
  <a href="#common-issues-and-questions">Common Issues</a> •
  <a href="#command-reference">Command Reference</a>
</p>

---

## Common Issues and Questions

These are some common issues or questions you may have about Approov integration.

### Check that your development environment is properly set up

Ensure that you have a recent version of `React Native` (>= 0.71) installed (see [installing react native](https://reactnative.dev/docs/environment-setup)). You also need `yarn` classic (1.x) (see [installing yarn](https://www.npmjs.com/package/yarn)). If you can build the default `react-native init` app, your React Native environment is likely set up properly.

For Android, you will also want access to `adb` for identifying device IDs and running `logcat` (see [Android Debug Bridge ](https://developer.android.com/studio/command-line/adb)). For iOS, you should also install `ios-deploy` to run on iOS devices (see [installing ios-deploy](https://github.com/ios-control/ios-deploy)).

For Approov, make sure you have installed and can run the `approov` CLI tool (see [installing Approov](https://approov.io/docs/latest/approov-installation/)). If you do not have access to Approov, you can sign up for a free trial at [https://www.approov.io/signup](https://www.approov.io/signup).

### Start with a working React Native app

You can start with any React Native app using the default runtime and standard react-native networking (fetch or axios ...).
Start with your own React Native app, or use one of the Approov-provided examples.

Two examples `shapes_axios` and `shapes_fetch` all work with a publicly available shapes service at `shapes.approov.io`.
We will use the Approov `shapes_fetch` example to illustrate the remaining steps to integrate Approov into a simple React Native app. To copy a pre-packaged example, start a command-line terminal, run the `react-native-approov example` command, and select an example and directory to install into:

```plaintext
$ npx @approov/react-native-approov example
✔ Select example app to copy › shapes_fetch
✔ Specify destination path … .
✔ Created shapes-fetch example.
ℹ Installing shapes-fetch npm dependencies...

...

✔ Example shapes_fetch is installed.
```

### Integrate Approov into your app

You should start Approov integration by running the `react-native-approov check` command to see if the app is ready for integration.

You can then simply install Approov from npm using `npm install @approov/react-native-approov`.

### Establishing an active Approov session

The React Native plugin `reg-android` and `reg-ios` commands require an active Approov session to run.

First, you must have access to Approov. For a free 30-day trial, sign up at [https://www.approov.io/signup](https://www.approov.io/signup). You will receive an email with instructions on how to activate and setup your Approv account.

You must have an Approov session active with at least `developer` role capabilities. More information about roles and sessions can be found at [installing Approov](https://approov.io/docs/latest/approov-installation/).

Once a session is established, each react-native-approov command will extend your session for one hour.

### Checking and updating Approov-protected API domains

Before integrating Approov into your React Native app, you should add all API domains to your account which need API protection. For our shapes service examples, there is one API domain to protect, `shapes.approov.io`. You can check which API domains are protected using the `approov CLI:

### How do I setup my backend service to check for approved API calls?

API calls protected by Approov will include an Approov token which must be checked. Backend quickstarts for common server frameworks, lanquages, and API gateways can be accessed at [Backend API Quickstarts](https://approov.io/resource/quickstarts/#backend-api-quickstarts).

```
approov api --list
```

Which will output something like the following:

```plaintext
1 API domain:
 shapes.approov.io          type:restricted, alg:HS256
```

If you need to add API domains to your account:

```
approov api -add shapes.approov.io
```

You will be asked for confirmation:

```plaintext
WARNING: active role is for account <your-account>
WARNING: adding the API will have an immediate impact on your apps in production. If you wish to continue then please enter YES and return: YES
added new API domain shapes.approov.io with type:restricted, alg:HS256
```

Refer to [Managing API domains](https://approov.io/docs/latest/approov-usage-documentation/#managing-api-domains) for more information.

### Certificate public key pinning is built in

Approov provides built in support for automatic public key pinning of any Approov-protected API domains. Once integrated, Approov will independently check the certificates used by your API domains and use them to pin your API connections. Certificates can be updated and rotated using the `approov` CLI without requiring any changes to your deployed apps.

See [Approov Public Key Pinning Configuration](https://approov.io/docs/latest/approov-usage-documentation/#public-key-pinning-configuration) for more information.

### Customizing Approov token passing

When making API calls, Approov tokens are usually passed in headers, using the default `Approov-Token` header name. It is important that your React Native app and your backend API coordinate on the name of the header which carries the token. You can change this by making an `ApproovService.setTokenHeader` call in your `approovSetup` function. For instance:

```Javascript
ApproovService.setTokenHeader("X-Approov-Authorization", "Bearer ");
```

This changes the header name to `X-Approov-Authorization` and provides a `Bearer` prefix (with space) to the values.

### Binding authorization to Approov tokens

You may bind an Approov token to the value of any other header field. This is almost always used to bind Approov and Authorization tokens. When bound, the backend service verifies the Approov token and further that the Approov token was bound to only that authorization data value. See [Token Binding](https://approov.io/docs/latest/approov-usage-documentation/#token-binding) for additional information.

To enable token binding, specify the binding header name to a `ApproovService.setBindingHeader` call in your `approovSetup` function. For example:

```Javascript
ApproovService.setBindingHeader("Authorization");
```

 will extract data binding using from the `Authorization` header values.

### Prefetching an Approov token at app launch

Approov will typically attest a running app instance every five minutes. Each attestation fetches a new Approov token and requires communication between the app instance and the Approov service. By default, the first Approov token fetch occurs at the first API call after launch. Alternatively, you may elect to prefetch an Approov token immediately after launch by making an explicit call to the `prefetch` method in your `approovSetup` function:

```Javascript
ApproovService.prefetch():
```

### Troubleshooting Approov rejections

What can you do if you have integrated your app with Approov and your API calls are still being blocked? Consider the following steps:

1. Your app is attested every five minutes when active. If you recently added an app signing certificate when an app which is running then it won't have propagated. Relaunching the app may be all that is required.

2. Is your app definitely being signed with the correct certificate.

3. Are you running with a debugger attached or on an Android emulator? You can get valid tokens by [marking the signing certificate as being for development](https://approov.io/docs/latest/approov-usage-documentation/#development-app-signing-certificates).

4. Are you running on an iOS simulator? These apps are not signed and are thus not recognized by default. You can get valid Approov tokens on a specific device by ensuring you are [forcing a device ID to pass](https://approov.io/docs/latest/approov-usage-documentation/#forcing-a-device-id-to-pass). As a shortcut, you can use the `latest` as discussed so that the `device ID` doesn't need to be extracted from the logs or an Approov token.

5. Is the device you are using consistent with your [Security Policies](https://approov.io/docs/latest/approov-usage-documentation/#security-policies)? For example, apps running on an Android emulator will be rejected by the default security policy. You may change devices or [check the approov security policies](https://approov.io/docs/latest/approov-usage-documentation/#changing-security-policy) and/or [change security policies for an individual device](https://approov.io/docs/latest/approov-usage-documentation/#adding-a-device-security-policy).

6. You can also check [live metrics](https://approov.io/docs/latest/approov-usage-documentation/#metrics-graphs) to identify the cause of attestation failures.

7. If still stumped, contact Approov support for further assistance.

### Handling network errors

Networking calls are not 100% reliable, and regardless of Approov, you should have a strategy in place for when your API calls fail.

Your app will periodically make calls to teh Approov service before making your API calls. These calls will periodically fail, and Approov may retry these calls a few times before reporting a networking error. When Approov reports an error, it will be reported at the source of teh API call - a `fetch()` or `axios` call for example. If Approov believes the failure is temporary, for example, poor networking connectivity, the calls will return an HTTP response status code of `503` suggesting that the service is unavailable. If the networking appears to be permanently unavailable, for example, no networking permissions, then the service will throw an error. This is consistent with `fetch()` idioms, and should be compatible with your existing network failure handling strategy.

### Updating Android minimum SDK

Approov requires an Android API minimum SDK of 21. Prior to React Native `0.64`, the minimum SDK was `16`, so it is likely this value needs to be updated when integrating Approov. To update the minimum SDK, open the top-level `build.gradle` file at `<project>/android/build.gradle`, and find and change the `minSdkVersion` value to `21`:

```groovy
// Top-level build file where you can add configuration options common to all sub-projects/modules.

buildscript {
    ext {
        buildToolsVersion = "29.0.3"
        minSdkVersion = 21
        compileSdkVersion = 29
        targetSdkVersion = 29
        ndkVersion = "20.1.5948944"
    }

    ...
}
```

This value is checked by the `@react-native-approov check` command.

### Updating Android network permissions

On Android, Approov requires both  `INTERNET` and `ACCESS_NETWORK_STATE` permissions. It is likely that your React Native app will need to add the `ACCESS_NETWORK_STATE` permission. Open the `<project>/android/src/main/AndroidManifest.xml` file, and add the extra permission like this:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
  package="com.shapes_axios">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    ...
</manifest>
```

These permissions are checked by the `@react-native-approov check` command.

Note that the minimum SDK version you can use with the Approov package is 21 (Android 5.0). 

Please [read this](https://approov.io/docs/latest/approov-usage-documentation/#targeting-android-11-and-above) section of the reference documentation if targeting Android 11 (API level 30) or above.

Note you may need to apply specific [Android Obfuscation](https://approov.io/docs/latest/approov-usage-documentation/#android-obfuscation) rules for your app when releasing it.

### Running on an Android emulator

It is likely you developed your React Native project running on an Android emulator, and after Approov integration, your project will still run on an Android emulator. However, Approov's default security policies will reject any app running in an Android emulator. You can workaround this behavior in several ways:

1. Run your app on a physical device.

2. Ensure the emulator so the Approov service always returns a valid token.

This requires you to first identify the app's device ID running on the emulator (see [Extracting the Device ID](https://approov.io/docs/latest/approov-usage-documentation/#extracting-the-device-id)). Once you have extracted the device ID, run an Approov device command to ensure the device always passes:

```
approov forcepass -addDevice 123-deviceID-abc==
```

3. Mark the app signing certificate as being for development.

You can [mark the signing certificate as being for development](https://approov.io/docs/latest/approov-usage-documentation/#development-app-signing-certificates). This means that any app signed with the certificate will be marked as being for development, so you don't have to worry about the device ID changing.

Note, it is strongly recommended that you test your Approov-integrated app on multiple physical devices before deploying to production.

### Changing your deployment target on iOS

As of version `3.1.4` the React Native implementation require a minimum deployment target OS of `12.5`, so it is unlikely you need to change this value.

To set the deployment target, open the `iOS` project in xcode and go to the `General` settings for your app. In the `Deployment Info` section, you will see a checked `iPhone` tab with a deployment value next to it. Select the deployment value and change as needed.

The minimum deployment target is checked by the `@react-native-approov check` command.

### Disabling Flipper on iOS

[Flipper](https://fbflipper.com/) is a mobile debugger which is included by default in React Native apps.. Unfortunately, it is not currently compatible with physical iOS devices, and it tends to break most React Native builds. To disable flipper, go into the iOS podfile at `<project>/ios/podfile` and ensure that the `use_flipper!()` call is commented out (has a `#` preceding it on the same line) like this:

```ruby
require_relative '../node_modules/react-native/scripts/react_native_pods'
require_relative '../node_modules/@react-native-community/cli-platform-ios/native_modules'

install! 'cocoapods', :deterministic_uuids => false, :warn_for_unused_master_specs_repo => false

platform :ios, '13.4'

target 'shapes_axios' do

  ...

  # Enables Flipper.
  #
  # Note that if you have use_frameworks! enabled, Flipper will not work and
  # you should disable the next line.
  # use_flipper!()

  ...

end
```

### Running on an iOS simulator

It is likely you developed your React Native project running on an iOS simulator, and after Approov integration, your project will still run on an iOS simulator. However, Approov is unable to properly attest apps running on an iOS simulator, so it will always return an invalid Approov token. Apps built for the simulator are never code signed. You can workaround this behavior in several ways:

1. Run your app on a physical device.

2. Ensure the simulator device is set to always pass so the Approov service always returns a valid token.

This requires you to first identify your app's device ID on the simulator (see [Extracting the Device ID](https://approov.io/docs/latest/approov-usage-documentation/#extracting-the-device-id)). Once you have extracted the device ID, run an Approov device command to ensure the device always passes:

```
approov forcepass -addDevice 123-deviceID-abc==
```

This sets the app to always pass on the specific device ID.

Note, it is strongly recommended that you test your Approov-integrated app on multiple physical devices before deploying to production.

### Running on an iOS device

To truly test Approov API protection, you should be running your integrated app on a real device. Unlike running in on a simulator, running on a physical device requires code signing and device provisioning.

Connect a single iOS device to your host platform over USB and follow the instructions to [Run an App on a device](https://help.apple.com/xcode/mac/current/#/dev5a825a1ca) You must set up a development team; learn more on the [Signing & Capabilities Workflow](https://help.apple.com/xcode/mac/current/#/dev60b6fbbc7).

After integrating with Approov, there is a subtle problem running your app using `react-native run-ios --device`. Everything builds and runs properly, but because `react native run-ios` uses `lldb` to launch your app, Approov will always reject the app since it launcheded in a debugger.

To work around this, after building your app with `run-ios`, deploy the app, and finally launch it manually on the device. Here's a command sequence that relies on [ios-deploy](https://www.npmjs.com/package/ios-deploy), which you will need to install:

```
yarn run react-native run-ios --device
```
```
yarn run react-native deploy-ios
```

This can get tedious if you are doing frequent debug loops. Identify the app's device ID running on the device (see [Extracting the Device ID](https://approov.io/docs/latest/approov-usage-documentation/#extracting-the-device-id)). After you have extracted the device ID, run an Approov device command to make the device always pass:

```
approov forcepass -addDevice 123-deviceID-abc==

```

Once your app is set to always pass on the device, it will pass even if it is connected to a debugger. Though this does not test Approov attestation, you can now just use the single `react-native run-ios --device` command to build and run your app.

You can use this same approach when developing on a simulator; see [Running on an iOS simulator](#running-on-an-ios-simulator).

### Command `react native run-ios` fails initial run

Some projects have difficulty building directly using `yarn run react-native run-ios`. This sometimes happens in the first build after Approov integration.

If this occurs, try running your react native iOS project directly in xcode. Open your iOS project by selecting the `<project>.xcworkspace` and not the project. If this succeeds, builds after this should run normally using `yarn run react-native run-ios`.

### Other iOS considerations

React Native setup iOS projects using workspaces, so when opening a React Native iOS project in xcode, always open it by selecting the `<project>.xcworkspace` and not the project.

The `react-native-approov` commands assume that the name of the iOS workspace is also used as the project's only scheme name. Multiple configurations, such as `Debug` and `Release` are supported but not multiple schemes. Please [contact support](#getting-additional-help) if this is a problem.

### Removing Approov from your App

Removing Approov integration for your app just requires removing the `@approov/react-native-approov` package:

```
yarn remove @approov/react-native-approov
```

In addition to the package, the Approov SDKs, base configurations, and property files will be removed.

### Which Javascript network libraries are supported?

React Native natively implements the `XMLHttpRequest` (XHR) object. The built in `fetch()` call uses XHR calls as do popular networking libraries such as `axios`. Any networking calls using XHR route through native React Native and are fully supported by Approov integration.

Support is also provided for [rn-fetch-blob](https://github.com/joltup/rn-fetch-blob) if a special fork of the package must be used, available at [@approov/rn-fetch-blob] (https://www.npmjs.com/package/@approov/rn-fetch-blob).

Other networking libraries which are implemented using independent networking stacks rather than XHR do not use React Native networking and are not supported by Approov out of the box. If you have a need to use such a library, [contact support](#getting-additional-help), and we will work with you to complete the integration.

### Integration may fail on Linux when Node installed as a Snap package

There have been issues reported on Linux after installing Node using the Snap package, for example, [child_process spawn missing stdout](https://github.com/nodejs/node/issues/32430). This may cause package installations to fail when running `react-native-approov example` and `integrate` commands. The suggested workaround is to remove the snap node package and reinstall node using the linux distribution's package manager, for example, [installing node on ubuntu 20.04](https://dev.to/katerakeren/a-step-by-step-guide-to-installing-node-js-on-ubuntu-45h).

### Getting additional help

If you encounter issues when using `react-native-approov` which you cannot resolve using this document, please review the [React Native developer docs](https://reactnative.dev) and the [Approov user docs](https://approov.io/docs) for more detailed information. If you are still stuck, please [Contact Us](https://approov.io/contact).

## Command Reference

Approov integration is controlled by the `react-native-approov` command and several plugins to the `react-native` CLI.

### React-Native-Approov Commands

The command by-itself lists the available sub-commands:

```plaintext
$ npx @approov/react-native-approov

Usage: react-native-approov [options] [command]

Options:
  -V, --version                  output the version number
  -h, --help                     display help for command

Commands:
  check                          Check status of the current app
  example [options] [app] [dir]  Copy a quickstart example app into a new directory
  integrate [options]            Integrate Approov into the current app (deprecated)
  help [command]                 display help for command
```

#### react-native-approov example

Copy a prepared example into your filesystem using the `example` sub-command:

```plaintext
$ npx @approov/react-native-approov example --help

Usage: react-native-approov example [options] [app] [dir]

Copy a quickstart example app into a new directory

Options:
  --no-prompt  do not prompt for user input
  -h, --help   display help for command
```

#### react-native-approov check

Check that your React Native project is ready for Approov integration or is already properly integrated using the `check` sub-command:

```plaintext
$ npx @approov/react-native-approov check --help
Usage: react-native-approov check [options]

Check status of the current app

Options:
  -h, --help  display help for command
```

#### react-native-approov integrate

Previous versions of this quickstart used a default flow that integrated Approov using this `integate` option. If this option is used then configuration files are written into your app package that are read by the Approov integration when it first starts. This is still supported, but we recommend that for new integrations you explicitly include the `@approov/react-native-approov` package and use the `ApproovProvider` component as described. This provides more flexibility with newer Approov features. 

Integrate Approov into your React Native project using the `integrate` sub-command:

```plaintext
$ npx @approov/react-native-approov integrate --help

Usage: react-native-approov integrate [options]

Integrate Approov into the current app (deprecated)

Options:
  --token.name <name>      name of Approov token field (default: "Approov-Token")
  --token.prefix <string>  prefix prepended to Approov token string (default: "")
  --binding.name <name>    name of binding field (default: "")
  --init.prefetch          start token fetch at app launch (default: false)
  --no-prompt              do not prompt for user input
  -h, --help               display help for command
```

### React-Native Plugin Commands

Several sub-commands are added to the `react-native` CLi to support Approov.

#### react-native reg-android

Register the latest Android app with Approov:

```plaintext
react-native reg-android 

register Android debug APK

Options:
  --variant <variant>       select build variant (default: "debug")
  --expireAfter <duration>  expire registration after duration (default: "1h")
  -h, --help                output usage information

Example usage:
  register Android debug APK for 1h (default): 
  react-native reg-android

  register Android debug APK for 1 year, 2 days, 3 hours, and 4 minutes: 
  react-native reg-android --expireAfter 1y2d3h4m
```

#### react-native reg-ios

Register the latest iOS app with Approov:

```plaintext
register iOS debug device IPA

Options:
  --configuration <configuration>  select build configuration (default: "Debug")
  --expireAfter <duration>         expire registration after duration (default: "1h")
  -h, --help                       output usage information

Example usage:
  register iOS debug device IPA for 1h (default): 
  react-native reg-ios

  register iOS debug device IPA for 1 year, 2 days, 3 hours, and 4 minutes: 
  react-native reg-ios --expireAfter 1y2d3h4m
```

#### react-native deploy-ios

Deploy the latest iOS app to a device without launching it:

```plaintext
react-native deploy-ios 

deploy iOS debug app to device

Options:
  --configuration <configuration>  select build configuration (default: "Debug")
  -h, --help                       output usage information

Example usage:
  deploy iOS Release app to device:
  react-native deploy-android --configuration Release
```

## License

![GitHub](https://img.shields.io/github/license/approov/quickstart-react-native)

Copyright © 2023 Approov, Ltd.

---
