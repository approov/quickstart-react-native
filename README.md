# Quickstart React Native

This repository contains the npm package react-native-approov.

Needd to build out docs, but here's the basic manual flow...

## Basic Integration

As a user, you will add the @approov/react-native-approov package to your project.

For package development, we use a local package. To reproduce an Approov integration, do this:

### Simple Shapes App without Approov

1. Clone this repo.

2. Copy the react-native-approv/examples/shapes-fetch into a separate directory. The Axios example woorks exactly the same way. (If the npm package is available, the user would use `npx react-native-approov create-example shape-fetch` instead.)

3. Change into your shapes-fetch app directory.

4. run `yarn install`

5. Launch the app `yarn run android`.

6. You should see a shapes app with 'approov not installed' at the bottom.

### Integrate Approov with Basic Settings

1. Still in the shapes-fetch directory, `yarn add link:<relative-path-to-cloned-quickstart-react-native-repo>/react-native-approov` (note this would be `yarn add @approov/react-native-approov` if package publicly available.)

2. Get the approov sdk as approov-sdk.aar and move it into shapes-fetch/node_modules/react-native-approov/android/libs/.

3. Get your initial config and name it approov-sdk.config. Move it into your project's android/app/src/main/assets/.

4. Create an approov-sdk.props file and move to your project's android/app/src/main/assets/. This controls some basic fetch properties. A typical file looks like this:

```
# Approov SDK properties

APPROOV_TOKEN_STRATEGY=header
APPROOV_TOKEN_HEADER_NAME=Approov-Token
APPROOV_FETCH_FAILURE_STRATEGY=throw
DATA_HASH_STRATEGY=header
DATA_HASH_HEADER_NAME=Authorization
DATA_HASH_HEADER_VALUE=strip-bearer
```

5. Try `yarn run android`. You should see Approov installed at the bottom of teh app, but the token fetch fails because the app is not registered yet.

6. Rgeister your app, something like this: `approov registration ../../demo.tok -add android/app/build/outputs/apk/debug/app-debug.apk -expireAfter 30min`.

7. Restart app and check for good token fetches.
