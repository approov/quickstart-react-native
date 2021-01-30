/*
 * MIT License
 *
 * Copyright (c) 2016-present, Critical Blue Ltd.
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

package io.approov.service;

import android.content.SharedPreferences;
import android.util.Log;
import android.content.Context;

import com.criticalblue.approovsdk.Approov;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

import okhttp3.CertificatePinner;
import okhttp3.Interceptor;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;

public class ApproovService {
    private static final String TAG = "ApproovService";

    private static final String APPROOV_PREFS = "approov-prefs";
    private static final String APPROOV_CONFIG = "approov-config";

    // true if the Approov SDK initialized okay
    private boolean initialized;

    // context for handling preferences
    private Context appContext;

    // service change interface
    public interface Listener {
        public void approovServiceChanged(ApproovService approovService);
    }

    // service change listeners
    private List<Listener> listeners;

    /**
     * Creates an Approov service.
     *
     * @param context the application context.
     * @param config the initial config string.
     */
    public ApproovService(Context context, String config) {
        initialized = false;
        appContext = context;
        listeners = new ArrayList<Listener>();
    
        // initialize the Approov SDK
        String dynamicConfig = getConfig();
        try {
            Approov.initialize(context, config, dynamicConfig, null);
        } catch (IllegalArgumentException e) {
            Log.e(TAG, "Approov initialization failed: " + e.getMessage());
            return;
        }
        initialized = true;

        // if first launch of the app, update the config (no listeners to notify).
        if (dynamicConfig == null)
            updateConfig();
    }
    
    /**
     * Adds a service change listener.
     * 
     * @param listener the listener.
     */
    public void addListener(Listener listener) {
        if (listener != null) listeners.add(listener);
    }

    /**
     * Notifies listeners of a service change.
     */
    private void notifyListeners() {
        for(Listener listener: listeners) {
            listener.approovServiceChanged(this);
        }
    }

    /**
     * Loads the dynamic configuration string from non-volatile storage.
     *
     * The default implementation retrieves the string from shared preferences.
     *
     * @return config string, or null if not present
     */
    private String getConfig() {
        SharedPreferences prefs = appContext.getSharedPreferences(APPROOV_PREFS, 0);
        return prefs.getString(APPROOV_CONFIG, null);
    }

    /**
     * Stores the dynamic configuration string in non-volatile storage.
     *
     * The default implementation stores the string in shared preferences, and setting
     * the config string to null is equivalent to removing the config.
     *
     * @param config a configuration string
     */
    private void putConfig(String config) {
        SharedPreferences prefs = appContext.getSharedPreferences(APPROOV_PREFS, 0);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString(APPROOV_CONFIG, config);
        editor.apply();
    }

    /**
     * Updates the dynamic configuration string and notifies listener's of the change.
     */
    private synchronized void updateConfig() {
        Log.i(TAG, "Approov dynamic configuration updated");
        putConfig(Approov.fetchConfig());

        notifyListeners();
    }

    /**
     * Prefetches an Approov token in the background. The placeholder domain "www.approov.io" is
     * simply used to initiate the fetch and does not need to be a valid API for the account. This
     * method can be used to lower the effective latency of a subsequent token fetch by starting
     * the operation earlier so the subsequent fetch may be able to use a cached token.
     */
    public synchronized void prefetchToken() {
        if (initialized) {
            Approov.fetchApproovToken(new PrefetchCallbackHandler(), "www.approov.io");
        }
    }

    /**
     * Callback handler for prefetching an Approov token. We simply log as we don't need the token
     * itself, as it will be returned as a cached value on a subsequent token fetch.
     */
    final class PrefetchCallbackHandler implements Approov.TokenFetchCallback {
        // logging tag
        private static final String TAG = "ApproovPrefetch";

        @Override
        public void approovCallback(Approov.TokenFetchResult pResult) {
            if (pResult.getStatus() == Approov.TokenFetchStatus.UNKNOWN_URL) {
                Log.i(TAG, "Approov prefetch success");
            } else {
                Log.i(TAG, "Approov prefetch failure: " + pResult.getStatus().toString());
            }
        }
    }

    /**
     * Returns the current token from the Approov SDK.
     * 
     * A token fetch may be necessary if the current token has expired.
     * 
     * @param domain the domain of the API request to be protected by Approov.
     * @return the current Approov token or an empty string if domain not protected.
     * @throws IOException if the fetch fails.
     */

    public String getToken(String domain) throws IOException {
        // request an Approov token for the domain
        Approov.TokenFetchResult approovResults = Approov.fetchApproovTokenAndWait(domain);
        Log.i(TAG, "Approov Token for " + domain + ": " + approovResults.getLoggableToken());

        // update dynamic configuration and pins
        if (approovResults.isConfigChanged()) {
            updateConfig();
        }

        if (approovResults.getStatus() == Approov.TokenFetchStatus.SUCCESS) {
            // on success, return token
            return approovResults.getToken();
        } else if ((approovResults.getStatus() == Approov.TokenFetchStatus.NO_APPROOV_SERVICE) &&
                (approovResults.getStatus() == Approov.TokenFetchStatus.UNKNOWN_URL) &&
                (approovResults.getStatus() == Approov.TokenFetchStatus.UNPROTECTED_URL)) {
            // on no approov service or domain not registered with Approov, return empty string
            return "";
        } else if  ((approovResults.getStatus() == Approov.TokenFetchStatus.NO_NETWORK) &&
                (approovResults.getStatus() == Approov.TokenFetchStatus.POOR_NETWORK) &&
                (approovResults.getStatus() == Approov.TokenFetchStatus.MITM_DETECTED)) {
            // on transient failures, signal retry
            return "RETRY";
        } else {
            // we have failed to get an Approov token in such a way that there is no point in proceeding
            // with the request - generally a retry is needed, unless the error is permanent
            throw new IOException("Approov token fetch failed: " + approovResults.getStatus().toString());
        }
    }

    /**
     * Returns the current certificate pin map.
     *
     * @param pinType is the type of pinning information that is required
     * @return a map of domains to the list of pins.
     */
    public Map<String, List<String>> getPins(String pinType) {
        return Approov.getPins(pinType);
    }

    /**
     * Sets a hash of the given data value into the 'pay' claim of Approov tokens.
     * 
     * @param data the data string to be hashed.
     */
    public void bindToken(String data) {
        Approov.setDataHashInToken(data);
    }
}
