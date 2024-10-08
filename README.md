# Approov Quickstart: React Native

This quickstart is written specifically for Android and iOS apps that are implemented using [`React Native`](https://reactnative.dev/) and the [`React Native Networking`](https://reactnative.dev/docs/network), including any networking based on the `XMLHttpRequest API` so including `axios`. Support is also provided for [rn-fetch-blob](https://github.com/joltup/rn-fetch-blob). If this is not your situation then check if there is a more relevant quickstart guide available.

This page provides all the steps for integrating Approov into your app. Additionally, a step-by-step tutorial guide using our [Shapes App Example](https://github.com/approov/quickstart-react-native/blob/main/SHAPES-EXAMPLE.md) is also available.

To follow this guide you should have received an onboarding email for a trial or paid Approov account and be using a version of ReactNative of 0.71 or above.

It is possible to use this with [Expo](https://expo.dev/), although not with [Expo Go](https://expo.dev/client) as native library modules are required.

Note that the minimum OS requirement for iOS is 13.4 and for Android the minimum SDK version is 21 (Android 5.0). You cannot use Approov in apps that need to support OS versions older than this.

## CHECK INTEGRATION COMPATIBILITY

The Approov npm package provides a special check command to see if the app is ready for integration. Execute this using [npx](https://www.npmjs.com/package/npx) in the top level directory of your app:

```
npx @approov/quickstart-react-native check
```

> Note, although the `npx` command may ask to install the package it is not permanently added to your app.

The output provides a checklist and reports any issues. Fix any errors reported, such as version updates or extra permissions. On Android, for example, the minimum SDK is 21, and the additional `ACCESS_NETWORK_STATE` permission is required. Please [read this](https://approov.io/docs/latest/approov-usage-documentation/#targeting-android-11-and-above) section of the reference documentation if targeting Android 11 (API level 30) or above.

Once all issues are fixed, you should rerun your app to verify it is working as before. You are now ready to add Approov protection.

## ADDING THE APPROOV PACKAGE

Add the Approov service layer to your existing App with the following command:

```
npm install @approov/approov-service-react-native
```

Note if you experience an error related to peer dependencies, then you can append the `--force` to install with your particular React Native version. The plugin supports version 0.75 or above.

If you are installing into an Expo project then use:

```
expo install @approov/approov-service-react-native
```

For iOS you must also install [pod](https://cocoapods.org/) dependencies. Change the directory to `ios` and type:

```
pod install
```

Note: do not worry if this generates warnings about duplicate UUIDs.

## ACTIVATING APPROOV

In order to use Approov you must include it as a component that wraps your application components. This automatically deals with initializing Approov when the app is started. Import using the following:

```Javascript
import { ApproovProvider, ApproovService } from '@approov/approov-service-react-native';
```

This defines an `ApproovProvider` component and the `ApproovService` which allows you to make certain calls to Approov from your application.

You should define an initially empty function that is called just before Approov is initialized. You may wish to include certain `ApproovService` calls in this in the future:

```Javascript
const approovSetup = () => {
};
```

You must now wrap your application with the `ApproovProvider` component. For instance, if your app's components (typically defined in `App.js`) are currently:

```Javascript
return (
  <View>
    <Button onPress={callAPI} title="Press Me!" />
  </View>
);
```

This should be changed to the following:

```Javascript
return (
  <ApproovProvider config="<enter-your-config-string-here>" onInit={approovSetup}>
    <View>
      <Button onPress={callAPI} title="Press Me!" />
    </View>
  </ApproovProvider>
);
```

The `<enter-your-config-string-here>` is a custom string that configures your Approov account access. This will have been provided in your Approov onboarding email.

## CHECKING IT WORKS
Once the initialization is called, it is possible for any network requests to have Approov tokens or secret substitutions made. Initially you won't have set which API domains to protect, so the requests will be unchanged. It will have called Approov though and made contact with the Approov cloud service. You will see `ApproovService` logging indicating `UNKNOWN_URL` (Android) or `unknown URL` (iOS).

You may use the `ApproovMonitor` component (also imported from `@approov/approov-service-react-native`) inside the `ApproovProvider`. This will output console logging on the state of the Approov initialization.

On Android, you can see logging using [`logcat`](https://developer.android.com/studio/command-line/logcat) output from the device. You can see the specific Approov output using `adb logcat | grep ApproovService`. On iOS, look at the console output from the device using the [Console](https://support.apple.com/en-gb/guide/console/welcome/mac) app from MacOS. This provides console output for a connected simulator or physical device. Select the device and search for `ApproovService` to obtain specific logging related to Approov.

Your Approov onboarding email should contain a link allowing you to access [Live Metrics Graphs](https://approov.io/docs/latest/approov-usage-documentation/#metrics-graphs). After you've run your app with Approov integration you should be able to see the results in the live metrics within a minute or so. At this stage you could even release your app to get details of your app population and the attributes of the devices they are running upon.

## NEXT STEPS
To actually protect your APIs and/or secrets there are some further steps. Approov provides two different options for protection:

* [API PROTECTION](https://github.com/approov/quickstart-react-native/blob/main/API-PROTECTION.md): You should use this if you control the backend API(s) being protected and are able to modify them to ensure that a valid Approov token is being passed by the app. An [Approov Token](https://approov.io/docs/latest/approov-usage-documentation/#approov-tokens) is short lived crytographically signed JWT proving the authenticity of the call.

* [SECRETS PROTECTION](https://github.com/approov/quickstart-react-native/blob/main/SECRETS-PROTECTION.md): This allows app secrets, including API keys for 3rd party services, to be protected so that they no longer need to be included in the released app code. These secrets are only made available to valid apps at runtime.

Note that it is possible to use both approaches side-by-side in the same app.

See [FAQ](https://github.com/approov/quickstart-react-native/blob/main/FAQ.md) for answers to common questions about the integration and troubleshooting.

See [REFERENCE](https://github.com/approov/quickstart-react-native/blob/main/REFERENCE.md) for a complete list of all of the Approov related methods.

## RN-FETCH-BLOB
Support is provided for the [rn-fetch-blob](https://github.com/joltup/rn-fetch-blob) networking stack. However, to use this a special fork of the package must be used. This is available at [@approov/rn-fetch-blob](https://www.npmjs.com/package/@approov/rn-fetch-blob). You will need to uninstall the standard package and install the special one as follows:

```
npm uninstall rn-fetch-blob
npm install @approov/rn-fetch-blob
```
