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

// provide an Axios request interceptor to enable Approov support
// USAGE:
//   import axios from 'axios';
//   import approovAxiosInterceptor from './ApproovAxiosSupport';
//   const axiosInstance = axios.create();
//   axiosInstance.interceptors.request.use(approovAxiosInterceptor.requestFulfilled);
//   axiosInstance.interceptors.response.use(null, approovAxiosInterceptor.responseRejected);
const approovAxiosInterceptor = {
    requestFulfilled: async (config) => {
        try {
            // bind a specified header value to the Approov token
            if (approovAxiosInterceptor.tokenBindingHeader) {
                const tokenBindingHeaderValue = config.headers[approovAxiosInterceptor.tokenBindingHeader];
                if (tokenBindingHeaderValue) {
                    Approov.setDataHashInToken(tokenBindingHeaderValue);
                }
            }

            // build absolute url from axios config
            // note: error thrown if url is null or if baseURL is null and url is not absolute
            const url = (new URL(config.url, config.baseURL)).href

            // authenticate the app with Approov servers and fetch an Approov token
            const result = await Approov.fetchApproovToken(config.url);
            console.log("Fetched Approov token: " + result.loggableToken);

            // store the result locally so we can handle request errors later
            config.fetchApproovTokenResult = result;

            // add the Approov token as a new request header
            config.headers['Approov-Token'] = result.token;

            return config;
        }
        catch (error) {
            console.log("Error fetching Approov token: " + JSON.stringify(error, null, 2));
            if (Approov.TokenFetchStatus.RETRY == error.userInfo.status) {
                return Promise.reject(error); // indicates a timed or user-initiated retry is required
            }
            return config;
        }
    },
    responseRejected: async (error) => {
        // check for SSL pinning errors
        if (error.fetchApproovTokenResult && error.fetchApproovTokenResult.isForceApplyPins) {
            console.log("SSL pinning error and Approov Force Apply Pins flag set - prompt for app restart");
            promptForAppRestart();
        }
        throw error;
    },
    tokenBindingHeader: null,
};

export default approovAxiosInterceptor;