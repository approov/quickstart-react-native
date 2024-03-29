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
import {NativeModules} from 'react-native';
const {ApproovService} = NativeModules;

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

// determine which API to use
const api = NativeModules.ApproovService
  ? {
      msg: 'Approov installed',
      version: 'Approov protected API (v3)',
      checkUrl: `https://shapes.approov.io/v1/hello`,
      fetchUrl: `https://shapes.approov.io/v3/shapes`,
      key: 'yXClypapWNHIifHUWmBIyPFAm',
    }
  : {
      msg: 'Approov not installed',
      version: 'initial API (v1)',
      checkUrl: `https://shapes.approov.io/v1/hello`,
      fetchUrl: `https://shapes.approov.io/v1/shapes`,
      key: 'yXClypapWNHIifHUWmBIyPFAm',
    };
console.log(`${api.msg}, using ${api.version}`);

// initialize Approov if it is installed. Note that this demo uses direct
// initialization via ApproovService rather than using ApproovProvider. In
// general we do not recommend this.
// PROVIDE YOUR APPROOV CONFIGURATION BELOW
if (NativeModules.ApproovService) {
  NativeModules.ApproovService.initialize("<enter-your-config-string-here>")
  .then(() => {
    console.log(`Approov initialized`);
  })
  .catch(error => {
    console.log(`Approov initialization error: ${error.message}`);
  });  
}

// define the headers used for requests
const headers = {
  'api-key': api.key,
};

// define App screen
const App = () => {
  // define state
  const [result, setResult] = useState({shape: 'logo', status: ''});

  // define check connection handler
  const checkConnection = () => {
    setResult({shape: 'confused', status: 'fetching'});
    fetch(api.checkUrl, {
      method: 'GET',
      headers: headers,
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Status ${response.status}`);
        }
        return response.json();
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
    setResult({shape: 'confused', status: 'fetching'});
    fetch(api.fetchUrl, {
      headers: headers,
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Status ${response.status}`);
        }
        return response.json();
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

  // return the screen for rendering
  return (
    <>
      <StatusBar barStyle="dark-content" />
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
        <View style={styles.apiBox}>
          <Text style={styles.api}>{api.msg}</Text>
        </View>
      </SafeAreaView>
    </>
  );
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
  apiBox: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  api: {
    fontSize: 16,
    color: 'red',
  },
});

export default App;
