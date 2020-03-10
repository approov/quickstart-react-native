# React Native Fetch Code Detail

This document discususes the Approov fetch support file `react-native-approov/src/ShapesApp/src/ApproovFetchSupport.js` that can be imported into a project in more detail.

## Approov Native Module Import

```
import Approov from 'react-native-approov';
```

This code block imports the Approov React Native module previously installed so we can use its functionality and the underling Android and iOS SDKs.

## App Restart Prompt Function

```
// prompt for app restart
const promptForAppRestart = () => {
   Alert.alert(
       'App Restart Requested',
       'Your app\'s security configuration has changed and your app must be restarted. Do you wish to restart now?',
       [
           { text: 'No', style: 'cancel' },
           { text: 'Yes', onPress: () => Approov.restart() },
       ],
       { cancelable: false },
   );
};
```

This code block provides a utility function to prompt the user to restart the mobile app when the app’s security configuration changes. This will be discussed later at the function call site when an app restart is required.

## Token Binding Header

```
// polyfill-style fetch interceptor to add Approov tokens to request header
const oldFetch = this.fetch;
const approovFetch = async (url, args) => {
 try {
   // bind a specified header value to the Approov token
   if (approovFetch.tokenBindingHeader) {
     const tokenBindingHeaderValue = args ? args.headers ? args.headers[approovFetch.tokenBindingHeader] : null : null;
     if (tokenBindingHeaderValue) {
       Approov.setDataHashInToken(tokenBindingHeaderValue);
     }
   }
```

This code block begins Approov’s version of fetch() (introduced in [React Native networking](https://facebook.github.io/react-native/docs/network)) so as to intercept an HTTP request and modify it for Approov protection before the request is transmitted. A custom version of fetch() must be created since this framework doesn’t supply an HTTP request/response interceptor mechanism out of the box.

If a developer has specified the name of an existing HTTP header whose value should be bound to an Approov token, then the current header value is hashed by the Approov SDK (using `Approov.setDataHashInToken`) before being transmitted to the Approov Cloud Service along with application data for authentication.

## Fetching a Token

```
   // authenticate the app with Approov servers and fetch an Approov token
   const result = await Approov.fetchApproovToken(url);
   console.log("Fetched Approov token: " + result.loggableToken);
```

Within Approov’s version of fetch(), the next step is to fetch an Approov token for the domain hosting the API of the current HTTP request. Fetching an Approov token (with `Approov.fetchApproovToken`) performs the actual authentication of the React Native app with the Approov Cloud Service, without using embedded secrets in the app. A lot of magic happens efficiently in this single call!

The call to `fetchApproovToken()` here returns an object which contains the Approov token (`10.` which should be kept secure and _never_ logged! `GOTO 10`), a loggable version of the Approov token for development purposes which is what we log here, the result of fetching an Approov token (values specified in `react-native-approov/src/react-native-approov/index.js`) and a value for whether the Approov configuration has been changed since the last token was fetched (for example, if the API domain leaf certificate’s public key has changed).

## Adding the Approov Token to a Request Header

```
   // delegate to the existing fetch API method, adding the Approov token as a new request header
   const fetchPromise = oldFetch(url, {
     headers: {
       'Approov-Token' : '' + result.token,
       ...args.headers,
     },
     ...args,
   });
```

Within Approov’s version of fetch(), the next step is to take the Approov token from our `fetchApproovToken()` result and add it to a request header, commonly named `Approov-Token` (although it may be anything you like). In the Shapes demo, the Shapes API will verify app authenticity by looking at the value of this specific header and verifying it using a common JWT verify function (see [jwt.io](https://jwt.io/introduction/) for more information).

## Check for SSL Pinning Errors


```
   // check for SSL pinning errors
   fetchPromise.catch((_error) => {
     if (result.isForceApplyPins) {
       console.log("SSL pinning error and Approov Force Apply Pins flag set - prompt for app restart");
       promptForAppRestart();
     }
   });
   return fetchPromise;
```

Within Approov’s version of fetch(), this code block adds a catch() promise rejection handler for the underlying fetch() call to handle an SSL pinning failure when the HTTP request is initiated.

If this is the case, we first determine whether the [pinning configuration](https://approov.io/docs/latest/approov-usage-documentation/#forcing-pin-application) has changed (`result.isForceApplyPins`) which will be the case if the API domain’s TLS certificate public key has changed.

Then, the user is prompted to restart the app and, if they agree, `Approov.restart()` is invoked to restart the majority of the app (and more importantly, the HTTP network stack).

Approov ensures apps connecting to server APIs are genuine, but the app must also make sure that it is connecting to a genuine server and not a proxy which is a common way of implementing a [Man-in-the-Middle](https://en.wikipedia.org/wiki/Man-in-the-middle_attack) attack to snoop data from the app. The Approov token should be protected from this form of data snooping too to prevent temporary unauthorized API access.

To enable this additional protection, the React Native Approov module ‘pins’ the various domains for API connections by validating their TLS certificate’s public key fingerprint. For example, in the Shapes app, the domain ‘shapes.approov.io’ is pinned by verifying the HTTPS connection’s leaf certificate public key fingerprint.

If the set of pins in Approov changes (typically through the [approov command line interface](https://www.approov.io/docs/latest/approov-cli-tool-reference/)) then running apps must reinitialise their network connection configurations. This requires that the app (or at least, the network stack) is restarted. The app may prompt the user to restart (as is the case in this demo), automatically restart, log the condition, and so on depending on what is most suitable.

## Handling an Approov Token Fetch Failure

```
catch (error) {
   console.log("Error fetching Approov token: " + JSON.stringify(error, null, 2));
   if (Approov.TokenFetchStatus.RETRY == error.userInfo.status) {
     return Promise.reject(error); // indicates a timed or user-initiated retry is required
   }
   return oldFetch(url, args);
 }
```
Within Approov’s version of fetch(), this final code block catches exceptions from the `fetchApproovToken()` call, logs the error, and decides whether to completely reject the API request (and assume a manual _retry_ will be performed by the user at a later time) or if the API request should continue as normal, but without the Approov token header.

This support file is included in the demo (rather than the Approov React Native module) for you to use as a template in your app so it can be customized as appropriate. For example, you may wish to use a different networking module, a different logging mechanism, and handle Approov token fetch failures and restarts in different ways from the demo.
