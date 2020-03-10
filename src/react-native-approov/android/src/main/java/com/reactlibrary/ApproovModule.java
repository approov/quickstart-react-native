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

 package com.reactlibrary;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Base64;
import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Callback;
import com.facebook.react.modules.network.OkHttpClientProvider;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;

import java.lang.IllegalArgumentException;
import java.net.MalformedURLException;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.io.IOException;
import java.io.FileOutputStream;
import java.io.PrintStream;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.FileInputStream;

import okhttp3.CertificatePinner;

import com.avishayil.rnrestart.ReactNativeRestart;

import com.criticalblue.approovsdk.Approov;
import com.criticalblue.approovsdk.Approov.TokenFetchStatus;
import com.criticalblue.reactnative.PinnedClientFactory;

public class ApproovModule extends ReactContextBaseJavaModule {

    private static final String E_APPROOV_ERROR = "E_APPROOV_ERROR";
    private static final String TAG = "APPROOV";
    private static final String INITIAL_CONFIG_FILE_NAME = "approov-initial.config";
    private static final String APPROOV_CONFIG = "approov-config";
    private static final String APPROOV_PREFS = "approov-prefs";

    private static boolean approovInitialised;
    private final ReactApplicationContext reactContext;
    private final ReactNativeRestart reactNativeRestart;

    public ApproovModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;

        this.reactNativeRestart = new ReactNativeRestart(reactContext);

        String initialConfig = null;
        String dynamicConfig = null;
        if (!approovInitialised) {
            // read the initial configuration for the Approov SDK
            try {
                InputStream stream = this.reactContext.getAssets().open(INITIAL_CONFIG_FILE_NAME);
                BufferedReader reader = new BufferedReader(new InputStreamReader(stream, "UTF-8"));
                initialConfig = reader.readLine();
                reader.close();
            } catch (IOException e) {
                // this should be fatal if the SDK cannot read an initial configuration
                throw new IllegalStateException("Approov initial configuration read failed: "
                    + e.getMessage() + ". Please make sure you have the file " + INITIAL_CONFIG_FILE_NAME
                    + " available in your app's android/app/src/main/assets/ directory.", e);
            }
    
            // read any dynamic configuration for the SDK from the app's shared preferences
            SharedPreferences prefs = this.reactContext.getSharedPreferences(APPROOV_PREFS, 0);
            dynamicConfig = prefs.getString(APPROOV_CONFIG, null);
    
            // initialize the Approov SDK
            try {
                Approov.initialize(this.reactContext, initialConfig, dynamicConfig, null);
                approovInitialised = true;
            } catch (IllegalArgumentException e) {
                // this should be fatal if the SDK cannot be initialized as all subsequent attempts
                // to use the SDK will fail
                throw new IllegalStateException("Approov initialization failed: " + e.getMessage(), e);
            }
        }

        // if we didn't have a dynamic configuration (after the first launch of the app) then
        // we write it to local storage now
        if (dynamicConfig == null)
            saveApproovDynamicConfig();

        updateCertificatePinset();
    }

    @Override
    public String getName() {
        return "Approov";
    }

    /**
     * Add a SHA-256 hash of the given data to the Approov token.
     *
     * @param data the data to hash
     */
    @ReactMethod
    public void setDataHashInToken(final String data) {
        Approov.setDataHashInToken(data);
    }

    /**
     * Perform a restart of the React Native Bridge to re-initialise the HTTP stack.
     */
    @ReactMethod
    public void restart() {
        this.reactNativeRestart.loadBundle();
    }
    
    @ReactMethod
    public void fetchApproovToken(final String url, final Promise promise) {

        Approov.fetchApproovToken(new Approov.TokenFetchCallback() {
            @Override
            public void approovCallback(Approov.TokenFetchResult result) {

                final String status;
                switch (result.getStatus()) {
                    case SUCCESS:
                    case NO_APPROOV_SERVICE:
                        status = "okay";
                        break;
                    case NO_NETWORK:
                    case POOR_NETWORK:
                    case MITM_DETECTED:
                        status = "retry";
                        break;
                    default:
                        status = "error";
                        break;
                }

                WritableMap promiseData = Arguments.createMap();
                promiseData.putString("token", result.getToken());
                promiseData.putString("loggableToken", result.getLoggableToken());
                promiseData.putBoolean("isConfigChanged", result.isConfigChanged());
                promiseData.putBoolean("isForceApplyPins", result.isForceApplyPins());
                promiseData.putString("status", status);

                if (result.isConfigChanged()) {
                    saveApproovDynamicConfig();
                }

                if ("okay".equals(status)) {
                    promise.resolve(promiseData);
                }
                else {
                    promise.reject(E_APPROOV_ERROR, "Failed to fetch Approov Token (see loggableToken for more info)", promiseData);
                }
            }
        }, url);
    }

    /**
     * Saves the Approov dynamic configuration to the app's shared preferences which is persisted
     * between app launches. This should be called after every Approov token fetch where
     * isConfigChanged is set. It saves a new configuration received from the Approov server to
     * the app's shared preferences so that it is available on app startup on the next launch.
     */
    private void saveApproovDynamicConfig() {
        String updateConfig = Approov.fetchConfig();
        if (updateConfig == null)
            Log.e(TAG, "Could not get dynamic Approov configuration");
        else {
            SharedPreferences prefs = this.reactContext.getSharedPreferences(APPROOV_PREFS, 0);
            SharedPreferences.Editor editor = prefs.edit();
            editor.putString(APPROOV_CONFIG, updateConfig);
            editor.apply();
            Log.i(TAG, "Wrote dynamic Approov configuration");
        }
    }

    /**
     * Update the pinset for TLS certificate-pinning and reconfigure the certificate pinner in the HTTP network stack.
     */
    private void updateCertificatePinset() {
        CertificatePinner.Builder builder = new CertificatePinner.Builder();
        Map<String, List<String>> pins = Approov.getPins("public-key-sha256");
        for (Map.Entry<String, List<String>> entry : pins.entrySet()) {
            for (String pin : entry.getValue()) {
                builder = builder.add(entry.getKey(), "sha256/" + pin);
                Log.i(TAG, "Adding OkHttp pin " + entry.getKey() + ":sha256/" + pin);
            }
        }
        CertificatePinner certificatePinner = builder.build();
        OkHttpClientProvider.setOkHttpClientFactory(new PinnedClientFactory(certificatePinner));
    }
}
