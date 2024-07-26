# API Protection
You should use this option if you wish to protect access to your APIs using an Approov token. We recommend this approach where it is possible to modify the backend API implementation to perform the token verification. Various [Backend API Quickstarts](https://approov.io/resource/quickstarts/#backend-api-quickstarts) are available to suit your particular situation depending on the backend technology used. You will need to implement this in addition to the steps in this frontend guide.

These steps require access to the [Approov CLI](https://approov.io/docs/latest/approov-cli-tool-reference/), please follow the [Installation](https://approov.io/docs/latest/approov-installation/) instructions.

## ADDING API DOMAINS
In order for Approov tokens to be added for particular API domains it is necessary to inform Approov about them. Execute the following command:

```
approov api -add your.domain
```
Approov tokens will then be added automatically to any requests to that domain (using the `Approov-Token` header, by default).

Note that this will use [Managed Trust Roots](https://approov.io/docs/latest/approov-usage-documentation/#managed-trust-roots) to ensure that no Man-in-the-Middle attacks on your app's communication are possible.

> **NOTE:** By default a symmetric account key is used to sign the Approov token (HS256 algorithm), so that all API domains will share the same signing secret. Alternatively, it is possible to use a [keyset key](https://approov.io/docs/latest/approov-usage-documentation/#managing-key-sets) which may differ for each API domain and for which a wide range of different signing algorithms and key types are available. This requires you to first [add a new key](https://approov.io/docs/latest/approov-usage-documentation/#adding-a-new-key), and then specify it when [adding each API domain](https://approov.io/docs/latest/approov-usage-documentation/#keyset-key-api-addition). Note that this will impact how you verify the token on your API backend.

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

## FURTHER OPTIONS
See [Exploring Other Approov Features](https://approov.io/docs/latest/approov-usage-documentation/#exploring-other-approov-features) for information about additional Approov features you may wish to try.

### Development Key
You may wish to [set a development key](https://approov.io/docs/latest/approov-usage-documentation/#using-a-development-key) in order to force an app to be passed, if it may be resigned by a different app signing certificate to which you don't have access. Perform the call:

```Javascript
ApproovService.setDevKey("uDW9FuLVpL1_4zo1");
```

See [using a development key](https://approov.io/docs/latest/approov-usage-documentation/#using-a-development-key) to understand how to obtain the development key which is the parameter to the call.

### Changing Approov Token Header Name
The default header name of `Approov-Token` can be changed as follows:

```Javascript
ApproovService.setTokenHeader("Authorization", "Bearer ");
```

The first parameter is the new header name and the second a prefix to be added to the Approov token. This is primarily for integrations where the Approov Token JWT might need to be prefixed with `Bearer` and passed in the `Authorization` header.

You are recommended to make this call inside the `approovSetup` function called by the `ApproovProvider`, to ensure this is setup prior to Approov initialization.

### Token Binding
If want to use [Token Binding](https://approov.io/docs/latest/approov-usage-documentation/#token-binding) then set the header holding the value to be used for binding as follows:

```Javascript
ApproovService.setBindingHeader("Authorization");
```

In this case it means that the value of `Authorization` holds the token value to be bound. This only needs to be called once. On subsequent requests the value of the specified header is read and its value set as the token binding value. Note that you should select a header whose value does not typically change from request to request, as each change requires a new Approov token to be fetched.

You are recommended to make this call inside the `approovSetup` function called by the `ApproovProvider`, to ensure this is setup prior to Approov initialization.

### Prefetching
If you wish to reduce the latency associated with fetching the first Approov token, then make this call inside the `approovSetup` function called by the `ApproovProvider`:

```Javascript
ApproovService.prefetch()
```

This initiates the process of fetching an Approov token in the background as soon as Approov is initialized, so that a cached token is available immediately when subsequently needed.

The `prefetch` returns a promise showing if it could be completed or not. You may wish to call it at later points of app execution if you know an Approov protected API call will be made in the near future.

Note that there is no point in performing a prefetch if you are using token binding and the binding value is changed.

### Prechecking
You may wish to do an early check in your app to present a warning to the user if it is not going to be able to obtain valid Approov tokens because it fails the attestation process. Here is an example of calling the appropriate method:

```Javascript
ApproovService.precheck()
.then(() => {
    // the precheck completed okay
})
.catch(error => {
    if (error.userInfo.type == "rejection")
        // failure due to the attestation being rejected, see error.message, error.userInfo.rejectionARC
        // and error.userInfo.rejectionReasons may be used to present information to the user (note
        // error.userInfo.rejectionReasons is only available if the feature is enabled, otherwise it is
        // always an empty string)
    else if (error.userInfo.type == "network")
        // failure due to a potentially temporary networking issue, allow for a user initiated retry,
        // see error.message
    else
        // a more permanent error, see error.message
});
```

This performs the operation in the background, and then either the provided success or failure function will be called.

> Note you should NEVER use this as the only form of protection in your app, this is simply to provide an early indication of failure to your users as a convenience. You must always also have APIs protected with Approov tokens that are essential to the operation of your app. This is because, although the Approov attestation itself is heavily secured, it may be possible for an attacker to bypass its result or prevent it being called at all.

If you wish to provide more direct feedback with the [Rejection Reasons](https://approov.io/docs/latest/approov-usage-documentation/#rejection-reasons) feature use:

```
approov policy -setRejectionReasons on
```

> Note that this command requires an [admin role](https://approov.io/docs/latest/approov-usage-documentation/#account-access-roles).
