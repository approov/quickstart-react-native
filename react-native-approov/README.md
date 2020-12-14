# react-native-approov

## WARNINGS

**This package is under development.**

**Android support is being tested.**

**iOS support is not complete.**

**Many of the steps below will be simplified through scripts.**

## Getting started

1. First build a working react native app.

Note: there are example apps in the react-native-approov package which will be available (not yet) using:

```
$ npx react-native-approov example create shape-fetch .
```

Until then, they are available in the private [quickstart react native](https://gitlab.com/criticalblue/playground/quickstart-react-native) repo.

2. Setup an Approov account and set your approov management token in APPROOV_MANAGEMENT_TOKEN.

3. Add the domains of the APIs you wish to protect to your account config.

4. Add @approov/react-native-approov to your react-native project:

```
$ cd <your-react-native-project>
$ yarn add @approov/react-native-approov
```

5. Copy your SDK config file into `node_modules/@approov/react-native-approov/android/src/assets/approov.config`.

6. If desired, create a custom props file and copy it into `node_modules/@approov/react-native-approov/android/src/assets/approov.props`.

The default props file look like:

```
# Approov SDK properties

# Name of token field (default: Approov-Token)
token.name=Approov-Token

# Prefix to add to token field value (default: "")
token.prefix=

# Name of binding field (default: "", example: Authorization)
binding.name=

# Prefix to strip from binding field value (default: Bearer, example: "")
binding.prefix=Bearer
```

7. Copy the latest approov SDK Android archive file into `node_modules/@approov/react-native-approov/android/libs/approov.aar`.

8. Build your app:

```
$ yarn run android
```

Your API calls will be rejected because your app is not yet registered with Approov.

9. Register your app.

10. Restart your app, and it should be functional and protected.
