/**
 * Copyright 2020 CriticalBlue Ltd.
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

import React, { useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  StatusBar,
  Text,
  Button,
} from 'react-native';
import ShapeView from './ShapeView';

// *** UNCOMMENT THE SECTION BELOW FOR APPROOV ***
// import approovFetch from './ApproovFetchSupport';
// approovFetch.tokenBindingHeader = 'Authorization';
// this.fetch = approovFetch;

const API_VERSION = 'v1'; // API v1 is unprotected; API v2 is protected by Approov
const HELLO_URL = `https://shapes.approov.io/${API_VERSION}/hello`;
const SHAPES_URL = `https://shapes.approov.io/${API_VERSION}/shapes`;


const App = () => {

  const [shape, setShape] = useState('logo');
  const [status, setStatus] = useState('');

  // check connection
  checkConnection = () => {
    fetch(HELLO_URL, {
      method: 'GET',
    })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Status ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      setShape('hello');
      setStatus(data.text);
    })
    .catch((error) => {
      console.log("Error fetching /hello endpoint data: " + JSON.stringify(error, null, 2));
      setShape('confused');
      setStatus(error.message);
    });
  }

  // get shape
  getShape = async () => {
    fetch(SHAPES_URL, {
      method: 'GET',
      // headers: {
      //   'Authorization': 'Bearer foobar',
      // },
    })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Status ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      setShape(data.shape);
      setStatus(data.status);
    })
    .catch((error) => {
      console.log("Error fetching /shapes endpoint data: " + JSON.stringify(error, null, 2));
      setShape('confused');
      setStatus(error.message);
    });
  }

  // render the app screen
  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={{fontSize: 24}}>Approov Shapes</Text>
        </View>
        <ShapeView style={styles.content} shape={shape} status={status}/>
        <View style={styles.footer}>
          <View style={styles.buttonBar}>
            <Button onPress={checkConnection} title="Test Hello" />
            <Button onPress={getShape} title="Get Shape" />
          </View>
        </View>
      </SafeAreaView>
    </>
  );
};

// flexbox styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#fff',
    margin: 10,
  },
  header: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  content: {
    flex: 8,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
  },
});

export default App;
