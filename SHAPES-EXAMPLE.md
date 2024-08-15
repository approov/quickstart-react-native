# Shapes Example

This quickstart is written specifically for Android and iOS apps that are implemented using [`React Native`](https://reactnative.dev). This quickstart provides a detailed step-by-step example of integrating Approov into an app using a simple `Shapes` example that shows a geometric shape based on a request to an API backend that can be protected with Approov.

## WHAT YOU WILL NEED
* Access to a trial or paid Approov account
* A recent version of `React Native` (>= 0.73) installed, see [installing react native](https://reactnative.dev/docs/environment-setup).
* You also need `yarn` classic (1.x), see [installing yarn](https://www.npmjs.com/package/yarn).
* The `approov` command line tool [installed](https://approov.io/docs/latest/approov-installation/) with access to your account
* [Android Studio](https://developer.android.com/studio) installed (version Hedgehog 2023.1 is used in this guide) if you will build the Android app. Note that the `ANDROID_SDK_ROOT` value must be properly defined to allow building.
* [Xcode](https://developer.apple.com/xcode/) installed (version 15.1 is used in this guide) to build iOS version of application
* [Cocoapods](https://cocoapods.org) installed to support iOS building (1.12.1 used in this guide)
* An iOS device or simulator if you are using the iOS platform (version 13.4 or later)
* An Android device or emulator if you are using the Android platform
* The content of this repo

## RUNNING THE SHAPES APP WITHOUT APPROOV

Firstly, we need to add the Shapes example itself. Two examples: `shapes_axios` and `shapes_fetch` all work with a publicly available shapes service at `shapes.approov.io`.

We will use the Approov `shapes_fetch` example to illustrate the remaining steps to integrate Approov into a simple React Native app. To copy a pre-packaged example, start a command-line terminal, run the `react-native-approov example` command:

```
npx @approov/react-native-approov example
```

Then select an example and directory to install into:

```
✔ Select example app to copy › shapes_fetch
✔ Specify destination path … .
✔ Created shapes-fetch example.
ℹ Installing shapes-fetch npm dependencies...

...

✔ Example shapes_fetch is installed.
```

The example react-native project is downloaded, npm packages are installed, and, on iOS, pod dependencies are also installed. The above output was elided for brevity.

Depending on your platform, before building your app, you may need to explicitly start the metro packager in the top-level React Native project directory as well as starting an emulator/simulator or connecting a physical device.

### Android

If you wish to run on a physical Android device then connect it to your host platform over USB. See [Run apps on a hardware device](https://developer.android.com/studio/run/device) for full instructions. Use `adb devices` to verify that this device is connected and no other device or emulator is running.

To actually run the app on an Android emulator or device, in a separate process or terminal window, ensure you are in the `shapes_fetch` directory and run android:

```
yarn run react-native run-android
```

### iOS

To test the app on the iOS simulator, run it from the same `shapes_fetch` directory:

```
yarn run react-native run-ios
```

If you obtain an error about `No simulator available` then you can override the default simulator with an explicit selection (`iPhone 14` in this case):

```
yarn run react-native run-ios --simulator="iPhone 14"
```

If you wish to run on a physical iOS device then connect it to your host platform over USB. See [Run an App on a device](https://help.apple.com/xcode/mac/current/#/dev5a825a1ca) for setup instructions.

You must set up a development team to set up code signing and establish the device provisioning profile. Open the Xcode project as follows:

```
open ios/shapes_fetch.xcworkspace
```

and navigate to the `shapes` project and select the `Signing & Capabilities` tab where signing can be configured.

Now run the app from the same `shapes_fetch` directory:

```
yarn run react-native run-ios --device
```

### Android and iOS

You should see an Approov Shapes app running. This is a plain React Native app as Approov is not installed.

![Initial App Screens](assets/basic-screens.png)

There are two buttons on the app. Pressing `check` will call the `shapes.approov.io` server's unprotected connectivity check endpoint `/v1/hello`, and this should succeed.

The `fetch` button requests a random shape from the API key protected `/v1/shapes` endpoint. This should succeed and you should see a successful shapes call with one of these shapes:

![iOS Shapes](assets/shapes-ios.png)

This endpoint is protected with an API key that is built into the code, and therefore can be easily extracted from the app. The subsequent steps of this guide show you how to provide better protection, either using an Approov Token or by migrating the API key to become an Approov managed secret.

## ADD THE APPROOV DEPENDENCY

In a shell terminal in the `shapes_fetch` directory, type the following command to install the Approov dependency:

```
npm install @approov/react-native-approov
```

Note if you experience an error related to peer dependencies, then you can append the `--force` to install with your particular React Native version. The plugin supports version 0.71 or above.

For iOS you must also install [pod](https://cocoapods.org/) dependencies. Change directory to `ios` and type:

```
pod install
```

Note: do not worry if this generates warnings about duplicate UUIDs.

## ENSURE THE SHAPES API IS ADDED

In order for Approov tokens to be generated or secrets managed for the shapes endpoint, it is necessary to inform Approov about it. Execute the following command:

```
approov api -add shapes.approov.io
```

Note that any Approov tokens for this domain will be automatically signed with the specific secret for this domain, rather than the normal one for your account.

## MODIFY THE APP TO USE APPROOV

Uncomment the marked line near the start of the file that imports `ApproovProvider` and `ApproovService`:

```Javascript
import { ApproovProvider, ApproovService } from '@approov/react-native-approov';
```

You should also change the Shapes endpoint the app is using by uncommenting the line:

```Javascript
fetchUrl: `https://shapes.approov.io/v3/shapes`,
```

Remember to comment out the previous definition of `fetchUrl`.

Next, uncomment the definition of the `approovSetup` function. Leave the body commented as this is only required if using secrets protection.

Next you need to uncomment the revised component hierarchy for the app that includes the `ApproovProvider` wrapping the app (remembering to comment out the previous definition):

```Javascript
return (
    <ApproovProvider config="<enter-your-config-string-here>" onInit={approovSetup}>
      <StatusBar barStyle="dark-content" />
      {mainView}
    </ApproovProvider>
  );
```

The Approov SDK needs a configuration string to identify the account associated with the app. It will have been provided in the Approov onboarding email (it will be something like `#123456#K/XPlLtfcwnWkzv99Wj5VmAxo4CrU267J1KlQyoz8Qo=`). Copy this to replace the text `<enter-your-config-string-here>`.

## ADD YOUR SIGNING CERTIFICATE TO APPROOV
You should add the signing certificate used to sign apps so that Approov can recognize your app as being official.

### Android
Add the local certificate used to sign apps in Android Studio. The following assumes it is in PKCS12 format:

```
approov appsigncert -add ~/.android/debug.keystore -storePassword android -autoReg
```

See [Android App Signing Certificates](https://approov.io/docs/latest/approov-usage-documentation/#android-app-signing-certificates) if your keystore format is not recognized or if you have any issues adding the certificate. This also provides information about adding certificates for when releasing to the Play Store. Note also that you need to apply specific [Android Obfuscation](https://approov.io/docs/latest/approov-usage-documentation/#android-obfuscation) rules when creating an app release.

### iOS
These are available in your Apple development account portal. Go to the initial screen showing program resources:

![Apple Program Resources](assets/program-resources.png)

Click on `Certificates` and you will be presented with the full list of development and distribution certificates for the account. Click on the certificate being used to sign applications from your particular Xcode installation and you will be presented with the following dialog:

![Download Certificate](assets/download-cert.png)

Now click on the `Download` button and a file with a `.cer` extension is downloaded, e.g. `development.cer`. Add it to Approov with:

```
approov appsigncert -add development.cer -autoReg
```

If it is not possible to download the correct certificate from the portal then it is also possible to [add app signing certificates from the app](https://approov.io/docs/latest/approov-usage-documentation/#adding-apple-app-signing-certificates-from-app).

> **IMPORTANT:** Apps built to run on the iOS simulator are not code signed and thus auto-registration does not work for them. In this case you can consider [forcing a device ID to pass](https://approov.io/docs/latest/approov-usage-documentation/#forcing-a-device-id-to-pass) to get a valid attestation.

## SHAPES APP WITH APPROOV API PROTECTION

Now we can run the app again.

### Android

```
yarn run react-native run-android
```

### iOS

For the iOS simulator:

```
yarn run react-native run-ios
```

Unfortunately, rerunning the app with the `yarn run react-native run-ios --device` command will not work as expected to run on a physical device because react-native uses the `lldb` debugger to launch the app. The default Approov security policy will block an app running in a debugger from obtainng valid Approov tokens. Instead, run the `deploy-ios` command:

```
yarn run react-native deploy-ios
```
This will deploy but not launch the app. Launch the app manually on your device.

### Android and iOS

Now press the `fetch` button. You should now see this (or another shape):

![Android Shapes](assets/shapes-android.png)

This means that the app is obtaining a validly signed Approov token to present to the shapes endpoint.

> **NOTE:** Running the app on an Android emulator or iOS simulator will not provide valid Approov tokens. You will need to ensure it always passes on your the device (see below).

## WHAT IF I DON'T GET SHAPES

If you don't get a valid shape then there are some things you can try. Remember this may be because the device you are using has some characteristics that cause rejection for the currently set [Security Policy](https://approov.io/docs/latest/approov-usage-documentation/#security-policies) on your account:

* Ensure that the version of the app you are running is signed with the correct certificate.
* On Android, look at the [`logcat`](https://developer.android.com/studio/command-line/logcat) output from the device. You can see the specific Approov output using `adb logcat | grep ApproovService`. This will show lines including the loggable form of any tokens obtained by the app. You can easily [check](https://approov.io/docs/latest/approov-usage-documentation/#loggable-tokens) the validity and find out any reason for a failure.
* On iOS, look at the console output from the device using the [Console](https://support.apple.com/en-gb/guide/console/welcome/mac) app from MacOS. This provides console output for a connected simulator or physical device. Select the device and search for `ApproovService` to obtain specific logging related to Approov. This will show lines including the loggable form of any tokens obtained by the app. You can easily [check](https://approov.io/docs/latest/approov-usage-documentation/#loggable-tokens) the validity and find out any reason for a failure.
* Use `approov metrics` to see [Live Metrics](https://approov.io/docs/latest/approov-usage-documentation/#metrics-graphs) of the cause of failure.
* You can use a debugger or emulator/simulator and get valid Approov tokens on a specific device by ensuring you are [forcing a device ID to pass](https://approov.io/docs/latest/approov-usage-documentation/#forcing-a-device-id-to-pass). As a shortcut, you can use the `latest` as discussed so that the `device ID` doesn't need to be extracted from the logs or an Approov token.
* Also, you can use a debugger or Android emulator and get valid Approov tokens on any device if you [mark the signing certificate as being for development](https://approov.io/docs/latest/approov-usage-documentation/#development-app-signing-certificates).

## SHAPES APP WITH SECRETS PROTECTION

This section provides an illustration of an alternative option for Approov protection if you are not able to modify the backend to add an Approov Token check.

Firstly, revert any previous change to `shapes_fetch/src/App.js` for `fetchUrl` so that it uses `https://shapes.approov.io/v1/shapes/`, which simply checks for an API key.

The `key` should also be changed to `shapes_api_key_placeholder`, removing the actual API key out of the code.

We need to inform Approov that it needs to substitute the placeholder value for the real API key on the `api-key` header. Find this line within the `approovSetup` function and uncomment it:

```Javascript
ApproovService.addSubstitutionHeader("api-key", "");
```

You must inform Approov that it should map `shapes_api_key_placeholder` to `yXClypapWNHIifHUWmBIyPFAm` (the actual API key) in requests as follows:

```
approov secstrings -addKey shapes_api_key_placeholder -predefinedValue yXClypapWNHIifHUWmBIyPFAm
```

> Note that this command requires an [admin role](https://approov.io/docs/latest/approov-usage-documentation/#account-access-roles).

Build and run the app again without making any changes to the app and press the `fetch` button. You should now see this (or another shape):

![Android Shapes](assets/shapes-android.png)

This means that the app is able to access the API key, even though it is no longer embedded in the app code, and provide it to the shapes request.
