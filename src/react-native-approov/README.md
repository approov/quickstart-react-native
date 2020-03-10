# react-native-approov

## Getting started

`$ npm install react-native-approov --save`

### Mostly automatic installation

`$ react-native link react-native-approov`

### Manual installation


#### iOS

1. In XCode, in the project navigator, right click `Libraries` ➜ `Add Files to [your project's name]`
2. Go to `node_modules` ➜ `react-native-approov` and add `Approov.xcodeproj`
3. In XCode, in the project navigator, select your project. Add `libApproov.a` to your project's `Build Phases` ➜ `Link Binary With Libraries`
4. Run your project (`Cmd+R`)<

#### Android

1. Open up `android/app/src/main/java/[...]/MainApplication.java`
  - Add `import com.reactlibrary.ApproovPackage;` to the imports at the top of the file
  - Add `new ApproovPackage()` to the list returned by the `getPackages()` method
2. Append the following lines to `android/settings.gradle`:
  	```
  	include ':react-native-approov'
  	project(':react-native-approov').projectDir = new File(rootProject.projectDir, 	'../node_modules/react-native-approov/android')
  	```
3. Insert the following lines inside the dependencies block in `android/app/build.gradle`:
  	```
      compile project(':react-native-approov')
  	```


## Usage
```javascript
import Approov from 'react-native-approov';

// TODO: What to do with the module?
Approov;
```
