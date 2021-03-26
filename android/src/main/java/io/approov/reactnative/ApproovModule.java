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

package io.approov.reactnative;

import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.modules.network.NetworkingModule;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.Properties;

import io.approov.service.ApproovService;

public class ApproovModule extends ReactContextBaseJavaModule {
    private static final String TAG = "ApproovModule";

    private static final String MODULE_NAME = "Approov";
    private static final String CONFIG_NAME = "approov.config";
    private static final String PROPS_NAME = "approov.props";

    private boolean shouldPrefetch;

    private final ReactApplicationContext reactContext;

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    private String loadApproovConfig() {
        String config;

        try {
            InputStream stream = this.reactContext.getAssets().open(CONFIG_NAME);
            BufferedReader reader = new BufferedReader(new InputStreamReader(stream, "UTF-8"));
            config = reader.readLine();
            reader.close();
        } catch (IOException e) {
            config = null;
            Log.e(TAG, "Approov initial configuration read failed: " +
                    e.getMessage() + ". Please make sure you have the file " + CONFIG_NAME +
                    " available in your app's android/app/src/main/assets/ directory.");
        }

        return config;
    }

    private void loadApproovProps() {
        String value;

        // try to load props

        Properties props = new Properties();
        try {
            props.load(reactContext.getAssets().open(PROPS_NAME));
            Log.i(TAG, "Approov props read from file " + PROPS_NAME);
        } catch(Exception e){
            Log.e(TAG, "Approov props read failed: " +
                    e.getMessage() + ". Please make sure you have the file " + PROPS_NAME +
                    " available in your app's android/app/src/main/assets/ directory." +
                    " Using defaults.");
        }

        // set appropriate props

        value = props.getProperty("init.prefetch");
        if (value == null || value.length() == 0) {
            shouldPrefetch = false;
        } else {
            shouldPrefetch = Boolean.parseBoolean(value);
        }
    }

    public ApproovModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;

        // load initial config
        String config = loadApproovConfig();

        // load properties
        loadApproovProps();

        // initialize Approov service
        ApproovService approovService = new ApproovService(reactContext, config);

        // prefetch token before first client request?
        if (shouldPrefetch) approovService.prefetchToken();

        // initialize and set custom approov okhttp client builder
        NetworkingModule.setCustomClientBuilder(new ApproovClientBuilder(reactContext, approovService));
    }

    // Native moodules seem to need at least one bridged method to be recognized
    // on the javascript side, so a module description was added.
    @ReactMethod
    public void fetchDescription(Promise promise) {
        promise.resolve("Approov Native Module for React Native");
    }
}
