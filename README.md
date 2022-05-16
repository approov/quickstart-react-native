# Approov Quickstart: React Native

This quickstart is written specifically for Android and iOS apps that are implemented using [`React Native`](https://reactnative.dev/) and the [`React Natibe Networking`](https://reactnative.dev/docs/network), including any networking based on the `XMLHttpRequest API` so including `frisbee` and `axios`. If this is not your situation then check if there is a more relevant quickstart guide available.

This quickstart provides the basic steps for integrating Approov into your app. A more detailed step-by-step guide using a [Shapes App Example](https://github.com/approov/quickstart-react-native/blob/main/SHAPES-EXAMPLE.md) is also available.

To follow this guide you should have received an onboarding email for a trial or paid Approov account.

## CHECK INTEGRATION COMPATIBILITY

The Approov npm package provides a special check command to see if the app is ready for integration. Execute this using [npx](https://www.npmjs.com/package/npx) in the top level directory of your app:

```
npx @approov/react-native-approov check
```

The output provides a checklist and reports any issues. Fix any errors reported, such as version updates or extra permissions. On Android, for example, the minimum SDK is 21, and the additional `ACCESS_NETWORK_STATE` permission is required. Please [read this](https://approov.io/docs/latest/approov-usage-documentation/#targeting-android-11-and-above) section of the reference documentation if targeting Android 11 (API level 30) or above.

Once all issues are fixed, you should rerun your app to verify it is working as before. You are now ready to add Approov protection.

## ADDING THE APPROOV PACKAGE

Simply add the Approov package with the following command:

```
npm install @approov/react-native-approov check
```

## INITIALIZING THE APPROOV SERVICE

In order to use Approov you must initialize it when your app is started. Import the required native modules as follows:

```Javascript
import {NativeModules} from 'react-native';
const {ApproovService} = NativeModules;
```
Place the initialization code in your main Javascript file so that it is executed early during the startup of your app and before any networking calls, that you want to protect with Approov, are made:

```Javascript
ApproovService.initialize("<enter-your-config-string-here>")
.then(() => {
  // initialization successful
})
.catch(error => {
  // initialization error - see error.message
});
```

The `<enter-your-config-string-here>` is a custom string that configures your Approov account access. This will have been provided in your Approov onboarding email.

## CHECKING IT WORKS
Once the initialization is called, it is possible for any network requests to have Approov tokens or secret substitutions made. Initially you won't have set which API domains to protect, so the requests will be unchanged. It will have called Approov though and made contact with the Approov cloud service. You will see `ApproovService` logging indicating `UNKNOWN_URL` (Android) or `unknown URL` (iOS).

On Android, you can see logging using [`logcat`](https://developer.android.com/studio/command-line/logcat) output from the device. You can see the specific Approov output using `adb logcat | grep ApproovService`. On iOS, look at the console output from the device using the [Console](https://support.apple.com/en-gb/guide/console/welcome/mac) app from MacOS. This provides console output for a connected simulator or physical device. Select the device and search for `ApproovService` to obtain specific logging related to Approov.

Your Approov onboarding email should contain a link allowing you to access [Live Metrics Graphs](https://approov.io/docs/latest/approov-usage-documentation/#metrics-graphs). After you've run your app with Approov integration you should be able to see the results in the live metrics within a minute or so. At this stage you could even release your app to get details of your app population and the attributes of the devices they are running upon.

## NEXT STEPS
To actually protect your APIs there are some further steps. Approov provides two different options for protection:

* [API PROTECTION](https://github.com/approov/quickstart-react-native/blob/main/API-PROTECTION.md): You should use this if you control the backend API(s) being protected and are able to modify them to ensure that a valid Approov token is being passed by the app. An [Approov Token](https://approov.io/docs/latest/approov-usage-documentation/#approov-tokens) is short lived crytographically signed JWT proving the authenticity of the call.

* [SECRETS PROTECTION](https://github.com/approov/quickstart-react-native/blob/main/SECRETS-PROTECTION.md): If you do not control the backend API(s) being protected, and are therefore unable to modify it to check Approov tokens, you can use this approach instead. It allows app secrets, and API keys, to be protected so that they no longer need to be included in the built code and are only made available to passing apps at runtime.

Note that it is possible to use both approaches side-by-side in the same app, in case your app uses a mixture of 1st and 3rd party APIs.

See [FAQ](https://github.com/approov/quickstart-react-native/blob/main/FAQ.md) for a answers to common questions about the integration and troubleshooting.

See [REFERENCE](https://github.com/approov/quickstart-react-native/blob/main/REFERENCE.md) for a complete list of all of the Approov related methods.
