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

package io.approov.reactnative;

import android.util.Log;

import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.modules.network.NetworkingModule;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;

import io.approov.service.ApproovService;

public class ApproovModule extends ReactContextBaseJavaModule {
    private static final String TAG = "ApproovModule";

    private static final String MODULE_NAME = "Approov";
    private static final String CONFIG_NAME = "approov.config";

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

    public ApproovModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;

        // load initial config
        String config = loadApproovConfig();

        // initialize Approov service
        ApproovService approovService = new ApproovService(reactContext, config);

        // prefetch token before first client request
        approovService.prefetchToken();

        // initialize and set custom approov okhttp client builder
        NetworkingModule.setCustomClientBuilder(new ApproovClientBuilder(reactContext, approovService));
    }
    
    /**
     * Logs a debug message to the Android log.
     * 
     * @param message the debug message.
     */ 
    @ReactMethod
    public void debug(String message) {
        Log.d(TAG, message != null? message : "");
    }
}
