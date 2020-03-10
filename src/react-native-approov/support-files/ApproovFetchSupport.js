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

import {
  Alert,
} from 'react-native';

import Approov from 'react-native-approov';

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

    // authenticate the app with Approov servers and fetch an Approov token 
    const result = await Approov.fetchApproovToken(url);
    console.log("Fetched Approov token: " + result.loggableToken);

    // delegate to the existing fetch API method, adding the Approov token as a new request header
    const fetchPromise = oldFetch(url, {
      headers: {
        'Approov-Token' : '' + result.token,
        ...args.headers,
      },
      ...args,
    });

    // check for SSL pinning errors
    fetchPromise.catch((_error) => {
      if (result.isForceApplyPins) {
        console.log("SSL pinning error and Approov Force Apply Pins flag set - prompt for app restart");
        promptForAppRestart();
      }
    });
    return fetchPromise;
  }
  catch (error) {
    console.log("Error fetching Approov token: " + JSON.stringify(error, null, 2));
    if (Approov.TokenFetchStatus.RETRY == error.userInfo.status) {
      return Promise.reject(error); // indicates a timed or user-initiated retry is required
    }
    return oldFetch(url, args);
  }
};

approovFetch.tokenBindingHeader = null;

export default approovFetch;