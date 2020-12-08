package com.criticalblue.reactnative;

import android.content.SharedPreferences;
import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Callback;
import com.facebook.react.modules.network.NetworkingModule;

import com.criticalblue.approovsdk.Approov;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;

import okhttp3.CertificatePinner;
import okhttp3.Interceptor;

public class ApproovModule extends ReactContextBaseJavaModule {

    private static final String TAG = "Approov RN";
    private static final String E_APPROOV_ERROR = "E_APPROOV_ERROR";
    private static final String INITIAL_CONFIG_FILE_NAME = "approov-sdk.config";
    private static final String APPROOV_CONFIG = "approov-config";
    private static final String APPROOV_PREFS = "approov-prefs";

    private static boolean approovInitialized;

    private final ReactApplicationContext reactContext;
    private Interceptor approovInterceptor;
    private CertificatePinner approovCertificatePinner;

    public ApproovModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;

        String initialConfig = null;
        String dynamicConfig = null;
        if (!approovInitialized) {
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
                approovInitialized = true;
            } catch (IllegalArgumentException e) {
                // this should be fatal if the SDK cannot be initialized as all subsequent attempts
                // to use the SDK will fail
                throw new IllegalStateException("Approov initialization failed: " + e.getMessage(), e);
            }
        }

        // if we didn't have a dynamic configuration (after the first launch of the app) then
        // we write it to local storage now
        if (dynamicConfig == null) {
            saveApproovDynamicConfig();
        }

        // initialize the networking module builder

        approovInterceptor = new ApproovInterceptor(this);
        approovCertificatePinner = ApproovCertificatePinner.build();

        NetworkingModule.setCustomClientBuilder(new ApproovClientBuilder(this));
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
     * Updates the dynamic configuration and the certificate pinner.
     */
    public void updateConfig() {
        saveApproovDynamicConfig();
        approovCertificatePinner = ApproovCertificatePinner.build();
    }

    public Interceptor getApproovInterceptor() {
    return approovInterceptor;
    }

    public CertificatePinner getApproovCertificatePinner() {
        return approovCertificatePinner;
    }

    @Override
    public String getName() {
        return "Approov";
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

    /**
     * Fetches the device id asynchronously.
     *
     * @param promise the promise resolving to teh device id.
     */
    @ReactMethod
    public void fetchDeviceID(final Promise promise) {
        String deviceId = Approov.getDeviceID();
        if (deviceId == null) {
            promise.reject("No deviceId.");
            return;
        }
        promise.resolve(deviceId);
    }
}
