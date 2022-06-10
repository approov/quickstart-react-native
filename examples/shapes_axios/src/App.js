/*
 * MIT License
 *
 * Copyright (c) 2016-present, CriticalBlue Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute,
 * sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
 * NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT
 * OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import React, {useState, useEffect} from 'react';
import {
  Button,
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import axios from 'axios';

// UNCOMMENT IF USING APPROOV
//import { ApproovProvider, ApproovService } from '@approov/react-native-approov';

const appTitle = 'Approov Shapes';
const checkTitle = 'check';
const fetchTitle = 'fetch';
const imgAssets = {
  logo: require('./assets/approov_largelogo.png'),
  hello: require('./assets/hello.png'),
  confused: require('./assets/confused.png'),
  Rectangle: require('./assets/rectangle.png'),
  Square: require('./assets/square.png'),
  Triangle: require('./assets/triangle.png'),
  Circle: require('./assets/circle.png'),
};

// API configuration parameters
const api = {
  // the check endpoint should always work
  checkUrl: `https://shapes.approov.io/v1/hello`,

  // COMMENT OUT IF USING APPROOV API PROTECTION
  fetchUrl: `https://shapes.approov.io/v1/shapes`,

  // UNCOMMENT OUT IF USING APPROOV API PROTECTION
  //fetchUrl: `https://shapes.approov.io/v3/shapes`,

  // COMMENT OUT IF USING APPROOV SECRETS PROTECTION
  key: 'yXClypapWNHIifHUWmBIyPFAm',

  // UNCOMMENT IF USING APPROOV SECRETS PROTECTION
  //key: 'shapes_api_key_placeholder',
};

// UNCOMMENT IF USING APPROOV
/*const approovSetup = () => {
  // UNCOMMENT IF USING APPROOV SECRETS PROTECTION
  //ApproovService.addSubstitutionHeader("api-key", "");
};*/

// headers to be included in requests
const headers = {
  'api-key': api.key,
};

// create an axios instance
const shapesService = axios.create({
  baseURL: api.baseUrl,
  headers: headers,
});

// define App screen
const App = () => {
  // define state
  const [result, setResult] = useState({shape: 'logo', status: ''});

  // define check connection handler
  const checkConnection = () => {
    setResult({shape: 'none', status: ''});
    shapesService
      .get(api.checkUrl)
      .then(response => {
        if (response.status != 200) {
          throw new Error(`Status ${response.status}: ${response.statusText}`);
        }
        return response.data;
      })
      .then(data => {
        console.log('Connection check passed');
        setResult({shape: 'hello', status: data.text});
      })
      .catch(error => {
        console.log(
          `Connection check failed: ${JSON.stringify(error, null, 2)}`,
        );
        setResult({shape: 'confused', status: error.message});
      });
  };

  // define fetch shape handler
  const fetchShape = () => {
    setResult({shape: 'none', status: ''});
    shapesService
      .get(api.fetchUrl)
      .then(response => {
        if (response.status != 200) {
          throw new Error(`Status ${response.status}: ${response.statusText}`);
        }
        return response.data;
      })
      .then(data => {
        console.log(`Shape fetch: ${data.shape}`);
        setResult({shape: data.shape, status: data.status});
      })
      .catch(error => {
        console.log(`Shape fetch failed: ${JSON.stringify(error, null, 2)}`);
        setResult({shape: 'confused', status: error.message});
      });
  };

  const mainView = (
    <SafeAreaView style={styles.container}>
      <View style={styles.titleBox}>
        <Text style={styles.title}>{appTitle}</Text>
      </View>
      <View style={styles.shapeBox}>
        <Image style={styles.shape} source={imgAssets[result.shape]} />
      </View>
      <View style={styles.statusBox}>
        <Text style={styles.status}>{result.status}</Text>
      </View>
      <View style={styles.controlsBox}>
        <View style={styles.buttonBar}>
          <Button onPress={checkConnection} title={checkTitle} />
          <Button onPress={fetchShape} title={fetchTitle} />
        </View>
      </View>
    </SafeAreaView>
  );

  // COMMENT IF USING APPROOV
  return (
    <>
      <StatusBar barStyle="dark-content" />
      {mainView}
    </>
  );

  // UNCOMMENT IF USING APPROOV
  /*return (
    <ApproovProvider config="<enter-your-config-string-here>" onInit={approovSetup}>
      <StatusBar barStyle="dark-content" />
      {mainView}
    </ApproovProvider>
  );*/
};

// screen styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: 'white',
    margin: 10,
  },
  titleBox: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
  },
  shapeBox: {
    flex: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shape: {
    resizeMode: 'contain',
    width: '80%',
    height: '80%',
  },
  statusBox: {
    flex: 4,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  status: {
    width: '80%',
    fontSize: 20,
    textAlign: 'center',
  },
  controlsBox: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
  },
  api: {
    fontSize: 16,
    color: 'red',
  },
});

export default App;
