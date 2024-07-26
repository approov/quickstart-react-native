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

import android.content.Context;
import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeMap;
import com.facebook.react.modules.network.NetworkingModule;

import com.criticalblue.approovsdk.Approov;

import org.json.JSONObject;
import org.json.JSONException;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.lang.reflect.Method;
import java.util.Properties;
import java.util.Map;
import java.util.HashMap;
import java.util.List;
import java.util.ArrayList;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

// ApproovService wraps the underlying Approov SDK, provides network interceptors bridges to allow calls from Javascript
public class ApproovService extends ReactContextBaseJavaModule {
    // logging tag
    private static final String TAG = "ApproovService";

    // module name that defines how it is called from Javascript
    private static final String MODULE_NAME = "ApproovService";

    // optional configuration and properties files
    private static final String CONFIG_NAME = "approov.config";
    private static final String PROPS_NAME = "approov.props";

     // header that will be added to Approov enabled requests
    private static final String APPROOV_TOKEN_HEADER = "Approov-Token";

    // any prefix to be added before the Approov token, such as "Bearer "
    private static final String APPROOV_TOKEN_PREFIX = "";

    // time window (in millseconds) applied to any network request attempts made before Approov
    // is initialized. The start of the window is defined by the first network request received
    // prior to initialization. That network request, and any others arriving during the window, may
    // then be delayed until the end of the window period. This is to allow time for the Approov
    // initialization to be completed as it may be in a race with API requests made as the app
    // starts up.
    private static final long STARTUP_SYNC_TIME_WINDOW = 2500;

    // flag indicating whether the Approov SDK has been initialized - if not then no Approov functionality is enabled
    private static boolean isInitialized = false;

    // any initial configuration used in order to detect a difference
    private static String initialConfig = null;

    // the application context used for certain framework calls
    private Context applicationContext;

    // the earliest time that any network request will be allowed to avoid any potential race conditions with Approov
    // protected API calls being made before Approov itself can be initialized - or 0 they may proceed immediately
    private long earliestNetworkRequestTime;

    // flag indicating if there is a pending prefetch to be executed upon initialization
    private boolean pendingPrefetch;

    // true if the interceptor should proceed on network failures and not add an Approov token
    private boolean proceedOnNetworkFail;

    // true if the logging should be suppressed for unknown (and excluded) URLs
    private boolean suppressLoggingUnknownURL;

    // header to be used to send Approov tokens
    private String approovTokenHeader;

    // any prefix String to be added before the transmitted Approov token
    private String approovTokenPrefix;

    // any header to be used for binding in Approov tokens or null if not set
    private String bindingHeader;

    // map of headers that should have their values substituted for secure strings, mapped to their
    // required prefixes
    private Map<String, String> substitutionHeaders;

    // set of query parameters that may be substituted, specified by the key name, mapped to their regex patterns
    private Map<String, Pattern> substitutionQueryParams;

    // set of URL regexs that should be excluded from any Approov protection, mapped to the compiled Pattern
    private Map<String, Pattern> exclusionURLRegexs;

    // list of listeners to changes in the Approov pins to be applied
    private List<PinChangeListener> pinChangeListeners;

    // interface for receiving updates on pin changes
    public interface PinChangeListener {
        public void approovPinsUpdated();
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    /**
     * Loads the optional Approov configuration from a file.
     * 
     * @return String of the configuration or null if not present
     */
    private String loadApproovConfig() {
        String config;
        try {
            InputStream stream = applicationContext.getAssets().open(CONFIG_NAME);
            BufferedReader reader = new BufferedReader(new InputStreamReader(stream, "UTF-8"));
            config = reader.readLine();
            reader.close();
            Log.d(TAG, "Approov configuration read from assets file " + CONFIG_NAME);
        } catch (IOException e) {
            config = null;
        }
        return config;
    }

    /**
     * Loads the optional Approov properties from a file.
     * 
     * @return Properties if present or null otherwise
     */
    private Properties loadApproovProps() {
        Properties props = new Properties();
        try {
            props.load(applicationContext.getAssets().open(PROPS_NAME));
            Log.d(TAG, "Approov properties read from assets file " + PROPS_NAME);
        } catch (Exception e) {
            props = null;
        }
        return props;
    }

    /**
     * Configures any special version of the "rn-fetch-blob" package to add Approov protection. This requires a special fork of the
     * package that adds a method that can set a custom client builder.
     * 
     * @param clientBuilder is the Approov enabled client builder that should be used
     */
    private void configureRNFetchBlobIfFound(ApproovClientBuilder clientBuilder) {
        try {
            // find the class we want to use
            Class<?> clazz = Class.forName("com.RNFetchBlob.RNFetchBlob");

            // call the "getInstance" method on the class by reflection
            Class<?>[] ctypes = { ReactApplicationContext.class };
            Object[] cparams = new Object[] { applicationContext };
            Method cmethod = clazz.getMethod("getInstance", ctypes);
            Object instance = cmethod.invoke(null, cparams);

            // call the special "addCustomClientBuilder" method on the instance with the Approov
            // client builder so that Approov protection is added to RNFetchBlob
            Class<?>[] itypes = {NetworkingModule.CustomClientBuilder.class};
            Object[] iparams = new Object[] { clientBuilder };
            Method imethod = clazz.getMethod("addCustomClientBuilder", itypes);
            imethod.invoke(instance, iparams);
            Log.d(TAG, "rn-fetch-blob package found and Approov protection added");
        }
        catch (ClassNotFoundException e) {
            Log.d(TAG, "rn-fetch-blob package not installed");
        }
        catch (Exception e) {
            Log.w(TAG, "The installed version of the rn-fetch-blob package is not compatible with Approov, so any fetch-blob requests will not be protected by Approov. See the Approov react native quickstart for more information.");
        }
    }

    /**
     * Creates a new ApproovService that wraps the underlying Approov SDK and provides a bridge
     * to Javascript methods.
     * 
     * @param reactContext is the application context to be used for certain framework calls
     */
    public ApproovService(ReactApplicationContext reactContext) {
        // initialize the service state
        super(reactContext);
        applicationContext = reactContext;
        earliestNetworkRequestTime = 0;
        pendingPrefetch = false;
        proceedOnNetworkFail = false;
        suppressLoggingUnknownURL = false;
        approovTokenHeader = APPROOV_TOKEN_HEADER;
        approovTokenPrefix = APPROOV_TOKEN_PREFIX;
        bindingHeader = null;
        substitutionHeaders = new HashMap<>();
        substitutionQueryParams = new HashMap<>();
        exclusionURLRegexs = new HashMap<>();
        pinChangeListeners = new ArrayList<>();

        // load any configuration and use it to initialize the SDK
        String config = loadApproovConfig();
        if (config != null) {
            // initialize the Approov SDK
            try {
                Approov.initialize(applicationContext, config, "auto", "init-fetch");
                Approov.setUserProperty("approov-react-native");
                initialConfig = config;
                isInitialized = true;
                Log.d(TAG, "initialized on launch on deviceID " + Approov.getDeviceID());
            } catch (IllegalArgumentException e) {
                Log.e(TAG, "initialization failed with IllegalArgument: " + e.getMessage());
            } catch (IllegalStateException e) {
                Log.e(TAG, "initialization failed with IllegalState: " + e.getMessage());
            }

            // load any properties and apply them
            Properties props = loadApproovProps();
            if (props != null) {
                // perform a background prefetch if that is requested in the properties
                String prefetch = props.getProperty("init.prefetch");
                if ((prefetch != null) && (prefetch.length() != 0) && Boolean.parseBoolean(prefetch))
                    prefetch();

                // set any alternative token header name and prefix
                String header = props.getProperty("token.name");
                if ((header != null) && (header.length() != 0)) {
                    String prefix = props.getProperty("token.prefix");
                    if (prefix == null)
                        prefix = "";
                    setTokenHeader(header, prefix);
                }
       
                // set any token binding header    
                String bindingHeader = props.getProperty("binding.name");
                if ((bindingHeader != null) && (bindingHeader.length() != 0))
                    setBindingHeader(bindingHeader);
            }
        }
        else
            Log.d(TAG, "started");

        // set the custom Approov OkHttp client builder in the React Native networking stack
        ApproovClientBuilder clientBuilder = new ApproovClientBuilder(this);
        NetworkingModule.setCustomClientBuilder(clientBuilder);

        // add the Approov client builder to any rn-fetch-blob instances
        configureRNFetchBlobIfFound(clientBuilder);
    }

    /**
     * Adds a pin change listener that will be notified of any future Approov
     * pin changes.
     * 
     * @param listener is the pin change listener
     */
    public synchronized void addPinChangeListener(PinChangeListener listener) {
       pinChangeListeners.add(listener);
    }

    /**
     * Gets all of the pin change listeners.
     * 
     * @return List of pin change listeners
     */
    public synchronized List<PinChangeListener> getPinChangeListeners() {
        return new ArrayList<PinChangeListener>(pinChangeListeners);
     }

    /**
     * Notifies pin change listeners of a pin update.
     */
    public void notifyPinChangeListeners() {
        List<PinChangeListener> listeners = getPinChangeListeners();
        for(PinChangeListener listener: listeners) {
            listener.approovPinsUpdated();
        }
    }

    /**
     * Construct a user info map for an error result.
     *
     * @param isNetworkError is true for a network, as opposed to general, error type
     */
    private WritableMap getErrorUserInfo(boolean isNetworkError) {
        WritableMap userInfo = new WritableNativeMap();
        if (isNetworkError)
            userInfo.putString("type", "network");
        else
            userInfo.putString("type", "general");
        return userInfo;
    }

    /**
     * Construct a user info map for a rejection result.
     * 
     * @param rejectionARC the ARC or empty string if not enabled
     * @param rejectionReasons the rejection reasons or empty string if not enabled
     */
    private WritableMap getRejectionUserInfo(String rejectionARC, String rejectionReasons) {
        WritableMap userInfo = new WritableNativeMap();
        userInfo.putString("type", "rejection");
        userInfo.putString("rejectionARC", rejectionARC);
        userInfo.putString("rejectionReasons", rejectionReasons);
        return userInfo;
    }

    /**
     * Sets the earliest network request based on the current time plus the window period if
     * the time has not been previously set.
     */
    public synchronized void setEarliestNetworkRequestTime() {
        if (earliestNetworkRequestTime == 0) {
            earliestNetworkRequestTime = System.currentTimeMillis() + STARTUP_SYNC_TIME_WINDOW;
            Log.i(TAG, "startup sync time window started");
        }
    }

    /**
     * Clears the earliest network request time so any network requests can proceed immediately.
     */
    private synchronized void clearEarliestNetworkRequestTime() {
        earliestNetworkRequestTime = 0;
    }

    /**
     * Returns the earliest time that network requests should be allowed, in milliseconds, or 0
     * if they are allowed immediately. This is used to perform a synchronization on any early network
     * request thats should perhaps be subject to Approov protection that are performed prior to the
     * initialization.
     * 
     * @return earliest network time in milliseconds, or 0 if no delay should be imposed
     */
    public synchronized long getEarliestNetworkRequestTime() {
        return earliestNetworkRequestTime;
    }

    /**
     * Initializes the Approov SDK and thus enables the Approov features if the
     * initialization was not performed using configuration files on launch.
     * 
     * @param config is the configuration to be used
     * @param promise to be fulfilled once the initialization is completed
     */
    @ReactMethod
    public void initialize(String config, Promise promise) {
        if (isInitialized) {
            // if the SDK is previously initialized then the config should be the same
            if (!config.equals(initialConfig)) {
                Log.e(TAG, "attempt to reinitialize with a different config");
                promise.reject("initialize", "attempt to reinitialize with a different config", getErrorUserInfo(false));
            }
        }
        else {
            // initialize the Approov SDK and notify any pin change listeners since pins may now
            // be available
            try {
                Approov.initialize(applicationContext, config, "auto", "init-fetch");
                Approov.setUserProperty("approov-react-native");
                initialConfig = config;
                isInitialized = true;
                clearEarliestNetworkRequestTime();
                Log.d(TAG, "initialized on deviceID " + Approov.getDeviceID());
                notifyPinChangeListeners();
                if (pendingPrefetch) {
                    prefetch();
                    pendingPrefetch = false;
                }
                promise.resolve(null);
            } catch (IllegalArgumentException e) {
                Log.e(TAG, "initialization failed with IllegalArgument: " + e.getMessage());
                promise.reject("initialize", "initialize IllegalArgument: " + e.getMessage(), getErrorUserInfo(false));
            } catch (IllegalStateException e) {
                Log.e(TAG, "initialization failed with IllegalState: " + e.getMessage());
                promise.reject("initialize", "initialize IllegalState: " + e.getMessage(), getErrorUserInfo(false));
            }
        }
    }

    /**
     * Returns the Approov initialization status.
     * 
     * @return true if Approov is initialized, false otherwise
     */
    public synchronized boolean isInitialized() {
        return isInitialized;
    }
 
    /**
     * Indicates that requests should proceed anyway if it is not possible to obtain an Approov token
     * due to a networking failure. If this is called then the backend API can receive calls without the
     * expected Approov token header being added, or without header/query parameter substitutions being
     * made. Note that this should be used with caution because it may allow a connection to be established
     * before any dynamic pins have been received via Approov, thus potentially opening the channel to a MitM.
     */
    @ReactMethod
    public synchronized void setProceedOnNetworkFail() {
        Log.d(TAG, "setProceedOnNetworkFail");
        proceedOnNetworkFail = true;
    }

    /**
     * Determines if requests should proceed on a network fail or not.
     * 
     * @return true if requests should proceed after a network fail
     */
    public synchronized boolean isProceedOnNetworkFail() {
        return proceedOnNetworkFail;
    }

    /**
     * Sets a development key indicating that the app is a development version and it should
     * pass attestation even if the app is not registered or it is running on an emulator. The
     * development key value can be rotated at any point in the account if a version of the app
     * containing the development key is accidentally released. This is primarily
     * used for situations where the app package must be modified or resigned in
     * some way as part of the testing process.
     *
     * @param devKey is the development key to be used
     * @param promise to be fulfilled once the development key has been set
     */
   @ReactMethod
   public void setDevKey(String devKey, Promise promise) {
       try {
           Approov.setDevKey(devKey);
           Log.d(TAG, "setDevKey");
           promise.resolve(null);
       }
       catch (IllegalStateException e) {
           promise.reject("setDevKey", "IllegalState: " + e.getMessage(), getErrorUserInfo(false));
       }
       catch (IllegalArgumentException e) {
           promise.reject("setDevKey", "IllegalArgument: " + e.getMessage(), getErrorUserInfo(false));
       }
   }

    /**
     * Indicates that logging for unknown (and excluded) URLs should be suppressed. This prevents excessive
     * logging for fetches not associated with Approov protection.
     */
    @ReactMethod
    public synchronized void setSuppressLoggingUnknownURL() {
        Log.d(TAG, "setSuppressLoggingUnknownURL");
        suppressLoggingUnknownURL = true;
    }

    /**
     * Determines if requests should proceed on a network fail or not.
     * 
     * @return true if logging should be suppressed for unknown (and excluded) URLs.
     */
    public synchronized boolean isSuppressLoggingUnknownURL() {
        return suppressLoggingUnknownURL;
    }

    /**
     * Sets the header that the Approov token is added on, as well as an optional
     * prefix String (such as "Bearer "). By default the token is provided on
     * "Approov-Token" with no prefix.
     *
     * @param header is the header to place the Approov token on
     * @param prefix is any prefix String for the Approov token header
     */
    @ReactMethod
    public synchronized void setTokenHeader(String header, String prefix) {
        Log.d(TAG, "setTokenHeader " + header + ", " + prefix);
        approovTokenHeader = header;
        approovTokenPrefix = prefix;
    }

    /**
     * Provides the Approov token header.
     * 
     * @return String token header
     */
    public synchronized String getTokenHeader() {
        return approovTokenHeader;
    }

    /**
     * Provides any specified Approov token prefix.
     * 
     * @return String token prefix
     */
    public synchronized String getTokenPrefix() {
        return approovTokenPrefix;
    }

    /**
     * Sets a binding header that may be present on requests being made. A header should be
     * chosen whose value is unchanging for most requests (such as an Authorization header).
     * If the header is present, then a hash of the header value is included in the issued Approov
     * tokens to bind them to the value. This may then be verified by the backend API integration.
     *
     * @param header is the header to use for Approov token binding
     */
    @ReactMethod
    public synchronized void setBindingHeader(String header) {
        Log.d(TAG, "setBindingHeader " + header);
        bindingHeader = header;
    }

    /**
     * Provides any specified binding header.
     * 
     * @return String binding header or null if not set
     */
    public synchronized String getBindingHeader() {
        return bindingHeader;
    }

    /**
     * Adds the name of a header which should be subject to secure strings substitution. This
     * means that if the header is present then the value will be used as a key to look up a
     * secure string value which will be substituted into the header value instead. This allows
     * easy migration to the use of secure strings. A required prefix may be specified to deal
     * with cases such as the use of "Bearer " prefixed before values in an authorization header.
     *
     * @param header is the header to be marked for substitution
     * @param requiredPrefix is any required prefix to the value being substituted
     */
    @ReactMethod
    public synchronized void addSubstitutionHeader(String header, String requiredPrefix) {
        Log.d(TAG, "addSubstitutionHeader " + header + ", " + requiredPrefix);
        substitutionHeaders.put(header, requiredPrefix);
    }

    /**
     * Removes a header previously added using addSubstitutionHeader.
     *
     * @param header is the header to be removed for substitution
     */
    @ReactMethod
    public synchronized void removeSubstitutionHeader(String header) {
        Log.d(TAG, "removeSubstitutionHeader " + header);
        substitutionHeaders.remove(header);
    }

    /**
     * Gets all of the substitution headers that are currently setup in a new map.
     * 
     * @return Map<String, String> of the substitution headers mapped to their required prefix
     */
    public synchronized Map<String, String> getSubstitutionHeaders() {
        return new HashMap<>(substitutionHeaders);
    }

    /**
     * Adds a key name for a query parameter that should be subject to secure strings substitution.
     * This means that if the query parameter is present in a URL then the value will be used as a
     * key to look up a secure string value which will be substituted as the query parameter value
     * instead. This allows easy migration to the use of secure strings.
     *
     * @param key is the query parameter key name to be added for substitution
     */
    @ReactMethod
    public synchronized void addSubstitutionQueryParam(String key) {
        try {
            Pattern pattern = Pattern.compile("[\\?&]"+key+"=([^&;]+)");
            substitutionQueryParams.put(key, pattern);
            Log.d(TAG, "addSubstitutionQueryParam " + key);
        }
        catch (PatternSyntaxException e) {
            Log.e(TAG, "addSubstitutionQueryParam " + key + " error: " + e.getMessage());
        }
    }

    /**
     * Removes a query parameter key name previously added using addSubstitutionQueryParam.
     *
     * @param key is the query parameter key name to be removed for substitution
     */
    @ReactMethod
    public synchronized void removeSubstitutionQueryParam(String key) {
        Log.d(TAG, "removeSubstitutionQueryParam " + key);
        substitutionQueryParams.remove(key);
    }

    /**
     * Gets all of the substitution query parameters that are currently setup in a new map.
     * 
     * @return Map<String, Pattern> of the substitution query parameters mapped to their regex patterns
     */
    public synchronized Map<String, Pattern> getSubstitutionQueryParams() {
        return new HashMap<>(substitutionQueryParams);
    }

    /**
     * Adds an exclusion URL regular expression. If a URL for a request matches this regular expression
     * then it will not be subject to any Approov protection. Note that this facility must be used with
     * EXTREME CAUTION due to the impact of dynamic pinning. Pinning may be applied to all domains added
     * using Approov, and updates to the pins are received when an Approov fetch is performed. If you
     * exclude some URLs on domains that are protected with Approov, then these will be protected with
     * Approov pins but without a path to update the pins until a URL is used that is not excluded. Thus
     * you are responsible for ensuring that there is always a possibility of calling a non-excluded
     * URL, or you should make an explicit call to fetchToken if there are persistent pinning failures.
     * Conversely, use of those option may allow a connection to be established before any dynamic pins
     * have been received via Approov, thus potentially opening the channel to a MitM.
     *
     * @param urlRegex is the regular expression that will be compared against URLs to exlude them
     */
    @ReactMethod
    public synchronized void addExclusionURLRegex(String urlRegex) {
        try {
            Pattern pattern = Pattern.compile(urlRegex);
            exclusionURLRegexs.put(urlRegex, pattern);
            Log.d(TAG, "addExclusionURLRegex " + urlRegex);
        }
        catch (PatternSyntaxException e) {
            Log.e(TAG, "addExclusionURLRegex " + urlRegex + " error: " + e.getMessage());
        }
    }

    /**
     * Removes an exclusion URL regular expression previously added using addExclusionURLRegex.
     *
     * @param urlRegex is the regular expression that will be compared against URLs to exlude them
     */
    @ReactMethod
    public synchronized void removeExclusionURLRegex(String urlRegex) {
        Log.d(TAG, "removeExclusionURLRegex " + urlRegex);
        exclusionURLRegexs.remove(urlRegex);
    }

    /**
     * Gets all of the exclusion URL regexs that are currently setup in a new map.
     * 
     * @return Map<String, Pattern> of the exclusion URL regexs mapped to their regex patterns
     */
    public synchronized Map<String, Pattern> getExclusionURLRegexs() {
        return new HashMap<>(exclusionURLRegexs);
    }

    /**
     * Performs a prefetch in the background. The domain "approov.io" is simply used to initiate the
     * fetch and does not need to be a valid API for the account. This method can be used to lower the
     * effective latency of a subsequent token fetch or secure strings lookup by starting the operation
     * earlier so the subsequent fetch should be able to use cached results. If this is called prior
     * to the initialization then a pending prefetch is setup to be executed just after initialization.
     */
    @ReactMethod
    public synchronized void prefetch() {
        if (isInitialized) {
            Log.d(TAG, "prefetch initiated");
            Approov.fetchApproovToken(new PrefetchHandler(), "approov.io");
        }
        else {
            Log.d(TAG, "prefetch pending");
            pendingPrefetch = true;
        }
    }

    /**
     * Callback handler for prefetching. We simply log as we don't need the token
     * itself, as it will be returned as a cached value on a subsequent token fetch.
     */
    final class PrefetchHandler implements Approov.TokenFetchCallback {
        @Override
        public void approovCallback(Approov.TokenFetchResult result) {
            if ((result.getStatus() == Approov.TokenFetchStatus.SUCCESS) ||
                (result.getStatus() == Approov.TokenFetchStatus.UNKNOWN_URL) ||
                (result.getStatus() == Approov.TokenFetchStatus.UNPROTECTED_URL)) {
                Log.d(TAG, "prefetch success");
            } else {
                Log.d(TAG, "prefetch failure: " + result.getStatus().toString());
            }
        }
    }

    /**
     * Performs a precheck to determine if the app will pass attestation. This requires secure
     * strings to be enabled for the account, although no strings need to be set up. The promise
     * will be rejected if there is some problem. The promise rejection userInfo.type will be
     * "network" for networking issues where a user initiated retry of the operation should be
     * allowed. If the attestation is rejected then the type will be "rejected" and then
     * userInfo.rejectionARC and userInfo.rejectionReasons may provide additional information about
     * the Approov rejection.
     * 
     * @param promise to be fulfilled once the precheck is completed
     */
    @ReactMethod
    public void precheck(Promise promise) {
        try {
            Approov.fetchSecureString(new PrecheckHandler(promise), "precheck-dummy-key", null);
        }
        catch (IllegalStateException e) {
            promise.reject("precheck", "IllegalState: " + e.getMessage(), getErrorUserInfo(false));
        }
        catch (IllegalArgumentException e) {
            promise.reject("precheck", "IllegalArgument: " + e.getMessage(), getErrorUserInfo(false));
        }
    }

    /**
     * Callback handler for prechecking that fulfills the provided promise when complete.
     */
    final class PrecheckHandler implements Approov.TokenFetchCallback {
        // promise to be fulflled by the handler
        private Promise promise;

        /**
         * Construct a new PrecheckHandler.
         * 
         * @param promise is the Promise to be fulfilled by the handler
         */
        public PrecheckHandler(Promise promise) {
            this.promise = promise;
        }

        @Override
        public void approovCallback(Approov.TokenFetchResult result) {
            if (result.getStatus() == Approov.TokenFetchStatus.UNKNOWN_KEY)
                Log.d(TAG, "precheck: passed");
            else
                Log.d(TAG, "precheck: " + result.getStatus().toString());
            if (result.getStatus() == Approov.TokenFetchStatus.REJECTED)
                // the precheck is rejected
                promise.reject("precheck", "precheck: REJECTED " + result.getARC() + " " + result.getRejectionReasons(),
                    getRejectionUserInfo(result.getARC(), result.getRejectionReasons()));
            else if ((result.getStatus() == Approov.TokenFetchStatus.NO_NETWORK) ||
                     (result.getStatus() == Approov.TokenFetchStatus.POOR_NETWORK) ||
                     (result.getStatus() == Approov.TokenFetchStatus.MITM_DETECTED))
                // we are unable to complete the precheck due to network conditions
                promise.reject("precheck", "precheck: " + result.getStatus().toString(), getErrorUserInfo(true));
            else if ((result.getStatus() != Approov.TokenFetchStatus.SUCCESS) &&
                     (result.getStatus() != Approov.TokenFetchStatus.UNKNOWN_KEY))
                // we are unable to complete the precheck due to a more permanent error
                promise.reject("precheck", "precheck: " + result.getStatus().toString(), getErrorUserInfo(false));
            else
                // notify that the precheck is now complete
                promise.resolve(null);
        }
    }

    /**
     * Gets the device ID used by Approov to identify the particular device that the SDK is running on. Note
     * that different Approov apps on the same device will return a different ID. Moreover, the ID may be
     * changed by an uninstall and reinstall of the app.
     * 
     * @param promise to be fulfilled with the device ID
     */
    @ReactMethod
    public void getDeviceID(Promise promise) {
        try {
            String deviceID = Approov.getDeviceID();
            Log.d(TAG, "getDeviceID: " + deviceID);
            promise.resolve(deviceID);
        }
        catch (IllegalStateException e) {
            promise.reject("getDeviceID", "IllegalState: " + e.getMessage(), getErrorUserInfo(false));
        }
  }

    /**
     * Directly sets the data hash to be included in subsequently fetched Approov tokens. If the hash is
     * different from any previously set value then this will cause the next token fetch operation to
     * fetch a new token with the correct payload data hash. The hash appears in the
     * 'pay' claim of the Approov token as a base64 encoded string of the SHA256 hash of the
     * data. Note that the data is hashed locally and never sent to the Approov cloud service.
     * 
     * @param data is the data to be hashed and set in the token
     * @param promise to be fulfilled once the data hash has been changed
     */
    @ReactMethod
    public void setDataHashInToken(String data, Promise promise) {
        try {
            Approov.setDataHashInToken(data);
            Log.d(TAG, "setDataHashInToken");
            promise.resolve(null);
        }
        catch (IllegalStateException e) {
            promise.reject("setDataHashInToken", "IllegalState: " + e.getMessage(), getErrorUserInfo(false));
        }
        catch (IllegalArgumentException e) {
            promise.reject("setDataHashInToken", "IllegalArgument: " + e.getMessage(), getErrorUserInfo(false));
        }
    }

    /**
     * Performs an Approov token fetch for the given URL. This should be used in situations where it
     * is not possible to use the networking interception to add the token. This will
     * likely require network access so may take some time to complete. The promise will be
     * rejected if there is some problem. The promise rejection userInfo.type will be "network" for
     * networking issues where a user initiated retry of the operation should be allowed.
     * 
     * @param url is the URL giving the domain for the token fetch
     * @param promise to be fulfilled with the result of the fetch
     */
    @ReactMethod
    public void fetchToken(String url, Promise promise) {
        try {
            Approov.fetchApproovToken(new FetchTokenHandler(promise), url);
        }
        catch (IllegalStateException e) {
            promise.reject("fetchToken", "IllegalState: " + e.getMessage(), getErrorUserInfo(false));
        }
        catch (IllegalArgumentException e) {
            promise.reject("fetchToken", "IllegalArgument: " + e.getMessage(), getErrorUserInfo(false));
        }
    }

    /**
     * Callback handler for fetching a token that fulfills the provided promise.
     */
    final class FetchTokenHandler implements Approov.TokenFetchCallback {
        // promise to be fulflled by the handler
        private Promise promise;

        /**
         * Construct a new FetchTokenHandler.
         * 
         * @param promise is the Promise to be fulfilled by the handler
         */
        public FetchTokenHandler(Promise promise) {
            this.promise = promise;
        }

        @Override
        public void approovCallback(Approov.TokenFetchResult result) {
            Log.d(TAG, "fetchToken: " + result.getStatus().toString());
            if ((result.getStatus() == Approov.TokenFetchStatus.NO_NETWORK) ||
                (result.getStatus() == Approov.TokenFetchStatus.POOR_NETWORK) ||
                (result.getStatus() == Approov.TokenFetchStatus.MITM_DETECTED))
                // we are unable to get the token due to network conditions
                promise.reject("fetchToken", "fetchToken: " + result.getStatus().toString(), getErrorUserInfo(true));
            else if (result.getStatus() != Approov.TokenFetchStatus.SUCCESS)
                // we are unable to get the token due to a more permanent error
                promise.reject("fetchToken", "fetchToken: " + result.getStatus().toString(), getErrorUserInfo(false));
            else
                // provide the Approov token result
                promise.resolve(result.getToken());
        }
    }

    /**
     * Gets the signature for the given message. This uses an account specific message signing key that is
     * transmitted to the SDK after a successful fetch if the facility is enabled for the account. Note
     * that if the attestation failed then the signing key provided is actually random so that the
     * signature will be incorrect. An Approov token should always be included in the message
     * being signed and sent alongside this signature to prevent replay attacks.
     *
     * @param message is the message whose content is to be signed
     * @param promise to be fulfilled with the signature
     */
    @ReactMethod
    public void getMessageSignature(String message, Promise promise) {
        try {
            String signature = Approov.getMessageSignature(message);
            Log.d(TAG, "getMessageSignature");
            if (signature == null)
                promise.reject("getMessageSignature", "no signature available", getErrorUserInfo(false));
            else
                promise.resolve(signature);
        }
        catch (IllegalStateException e) {
            promise.reject("getMessageSignature", "IllegalState: " + e.getMessage(), getErrorUserInfo(false));
        }
        catch (IllegalArgumentException e) {
            promise.reject("getMessageSignature", "IllegalArgument: " + e.getMessage(), getErrorUserInfo(false));
        }
    }

    /**
     * Fetches a secure string with the given key. If newDef is not null then a
     * secure string for the particular app instance may be defined. In this case the
     * new value is returned as the secure string. Use of an empty string for newDef removes
     * the string entry. The promise will be rejected if there is some problem. The promise
     * rejection userInfo.type will be "network" for networking issues where a user initiated
     * retry of the operation should be allowed. If the attestation is rejected then the type
     * will be "rejected" and then userInfo.rejectionARC and userInfo.rejectionReasons may provide
     * additional information about the Approov rejection. Note that the returned string
     * should NEVER be cached by your app, you should call this function when it is needed.
     *
     * @param key is the secure string key to be looked up
     * @param newDef is any new definition for the secure string, or null for lookup only
     * @param promise to be fulfilled with the secure string (should not be cached by your app)
     */
    @ReactMethod
    public void fetchSecureString(String key, String newDef, Promise promise) {
        // determine the type of operation as the values themselves cannot be logged
        String type = "lookup";
        if (newDef != null)
            type = "definition";

        // fetch any secure string keyed by the value, catching any exceptions the SDK might throw
        try {
           Approov.fetchSecureString(new FetchSecureStringHandler(promise, type, key), key, newDef);
        }
        catch (IllegalStateException e) {
            promise.reject("fetchSecureString", "IllegalState: " + e.getMessage(), getErrorUserInfo(false));
        }
        catch (IllegalArgumentException e) {
            promise.reject("fetchSecureString", "IllegalArgument: " + e.getMessage(), getErrorUserInfo(false));
        }
    }

    /**
     * Callback handler for fetching a secure string that fulfills the provided promise.
     */
    final class FetchSecureStringHandler implements Approov.TokenFetchCallback {
        // promise to be fulflled by the handler
        private Promise promise;

        // type of the secure string operation
        private String type;

        // secure string key being looked up
        private String key;

        /**
         * Construct a new FetchSecureStringHandler.
         * 
         * @param promise is the Promise to be fulfilled by the handler
         * @param type is the type of secure string operation
         * @param key is the secure string key being processed
         */
        public FetchSecureStringHandler(Promise promise, String type, String key) {
            this.promise = promise;
            this.type = type;
            this.key = key;
        }

        @Override
        public void approovCallback(Approov.TokenFetchResult result) {
            Log.d(TAG, "fetchSecureString " + type + " for " + key + ": " + result.getStatus().toString());
            if (result.getStatus() == Approov.TokenFetchStatus.REJECTED)
                // the secure string fetch has been rejected
                promise.reject("precheck", "fetchSecureString: REJECTED " + result.getARC() + " " + result.getRejectionReasons(),
                    getRejectionUserInfo(result.getARC(), result.getRejectionReasons()));
            else if ((result.getStatus() == Approov.TokenFetchStatus.NO_NETWORK) ||
                     (result.getStatus() == Approov.TokenFetchStatus.POOR_NETWORK) ||
                     (result.getStatus() == Approov.TokenFetchStatus.MITM_DETECTED))
                // we are unable to get the secure string due to network conditions
                promise.reject("fetchSecureString", "fetchSecureString: " + result.getStatus().toString(), getErrorUserInfo(true));
            else if ((result.getStatus() != Approov.TokenFetchStatus.SUCCESS) &&
                     (result.getStatus() != Approov.TokenFetchStatus.UNKNOWN_KEY))
                // we are unable to get the secure string due to a more permanent error
                promise.reject("fetchSecureString", "fetchSecureString: " + result.getStatus().toString(), getErrorUserInfo(false));
            else
                // provide the secure string result
                promise.resolve(result.getSecureString());
        }
    }

     /**
     * Fetches a custom JWT with the given payload. The promise will be rejected if there is
     * some problem. The promise rejection userInfo.type will be "network" for networking
     * issues where a user initiated retry of the operation should be allowed. If the
     * attestation is rejected then the type will be "rejected" and then userInfo.rejectionARC and
     * userInfo.rejectionReasons may provide additional information about the Approov rejection.
     *
     * @param payload is the marshaled JSON object for the claims to be included
     * @param promise to be fulfilled with the custom JWT (should not be cached by your app)
     */
    @ReactMethod
    public void fetchCustomJWT(String payload, Promise promise) {
        try {
            Approov.fetchCustomJWT(new FetchCustomJWTHandler(promise), payload);
        }
        catch (IllegalStateException e) {
            promise.reject("fetchCustomJWT", "IllegalState: " + e.getMessage(), getErrorUserInfo(false));
        }
        catch (IllegalArgumentException e) {
            promise.reject("fetchCustomJWT", "IllegalArgument: " + e.getMessage(), getErrorUserInfo(false));
        }
    }

    /**
     * Callback handler for fetching a custom JWT that fulfills the provided promise.
     */
    final class FetchCustomJWTHandler implements Approov.TokenFetchCallback {
        // promise to be fulflled by the handler
        private Promise promise;

        /**
         * Construct a new FetchCustomJWTHandler.
         * 
         * @param promise is the Promise to be fulfilled by the handler
         */
        public FetchCustomJWTHandler(Promise promise) {
            this.promise = promise;
        }

        @Override
        public void approovCallback(Approov.TokenFetchResult result) {
            Log.d(TAG, "fetchCustomJWT: " + result.getStatus().toString());
            if (result.getStatus() == Approov.TokenFetchStatus.REJECTED)
                // the custom JWT fetch has been rejected
                promise.reject("precheck", "fetchCustomJWT: REJECTED " + result.getARC() + " " + result.getRejectionReasons(),
                    getRejectionUserInfo(result.getARC(), result.getRejectionReasons()));
            else if ((result.getStatus() == Approov.TokenFetchStatus.NO_NETWORK) ||
                     (result.getStatus() == Approov.TokenFetchStatus.POOR_NETWORK) ||
                     (result.getStatus() == Approov.TokenFetchStatus.MITM_DETECTED))
                // we are unable to get the custom JWT due to network conditions
                promise.reject("fetchCustomJWT", "fetchCustomJWT: " + result.getStatus().toString(), getErrorUserInfo(true));
            else if (result.getStatus() != Approov.TokenFetchStatus.SUCCESS)
                // we are unable to get the custom JWT due to a more permanent error
                promise.reject("fetchCustomJWT", "fetchCustomJWT: " + result.getStatus().toString(), getErrorUserInfo(false));
            else
                // provide the custom JWT result
                promise.resolve(result.getToken());
        }
    }
}
