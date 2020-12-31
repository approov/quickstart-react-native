# react-native-approov

## WARNINGS

**This package is under development.**

**Android support is being tested.**

**iOS support is not complete.**

**Many of the steps below will be simplified through scripts.**

## Test Flow

0. Start with a react native app

We'll use an example Shapes app from the reacct-native-approov package:

```
$ npx react-native-approov example

```

Then run the app:

```
$ yarn react-native run-android

app requirements...

1. Prepare Approov Environment

You should have access to an Approov account and the `approov` CLI tool. Ensure that the environmental variable `APPROOV_MANAGEMEENT_TOKEN`
is set to the Approov management token string you received. Test this:

```
$ npx react-native-approov whhoaami
...
```

2. Integrate Approov into the React Native App

The integration command is not ready for prime time, soo use this flow for now:

create a setup directory: mkdir ../Approov; cd .../Approov

configure app's API endpoint domain(s):

approov API set to shapes demo

get library and initial config

approov SDK -getLibrary
approov SDK -getConfig

create approov.props file:

# Approov SDK properties

token.name=Approov-Token
token.prefix=
binding.name=Authorization
binding.prefix=Bearer

cd ../shapes-fetch
$ npx react-native-approov sync ../Approov
...

run-android

PICTURES of fail

reg-android
run-android

PICTURES of success

```
$ cd <your-react-native-project>
$ yarn add @approov/react-native-approov
```
