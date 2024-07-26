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

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.Properties;
import java.util.regex.Pattern;
import java.util.regex.Matcher;
import java.util.Map;

import android.content.Context;
import android.util.Log;

import okhttp3.Interceptor;
import okhttp3.Request;
import okhttp3.Response;

import com.criticalblue.approovsdk.Approov;

// interceptor to add Approov tokens or substitute headers and query parameters
public class ApproovInterceptor implements Interceptor {
    // logging tag
    private final static String TAG = "ApproovService";

    // service wrapping Approov SDK
    private ApproovService approovService;

    /**
     * Creates a new ApproovInterceptor for adding Approov protection to requests.
     *
     * @param approovService the Approov service being used
     */
    public ApproovInterceptor(ApproovService approovService) {
        this.approovService = approovService;
    }

    @Override
    public Response intercept(Chain chain) throws IOException {
        // if there are any accesses to localhost then they are just passed through
        Request request = chain.request();
        String url = request.url().toString();
        String host = request.url().host();
        if (host.equals("localhost")) {
            if (!approovService.isSuppressLoggingUnknownURL())
                Log.d(TAG, "localhost forwarded: " + url);
            return chain.proceed(request);
        }

        // if Approov is not initialized then perform any necessary synchronization to avoid a race on any
        // initial network fetches
        if (!approovService.isInitialized()) {
            // mark the earliest network fetch request time prior to initialization - it is only updated
            // if it is currently unset
            approovService.setEarliestNetworkRequestTime();

            // wait until any initial fetch time is reached
            boolean waitForReady = true;
            while (waitForReady) {
                long currentTime = System.currentTimeMillis();
                long earliestTime = approovService.getEarliestNetworkRequestTime();
                if (currentTime >= earliestTime)
                    waitForReady = false;
                else {
                    // sleep for a short period to block this request thread
                    Log.d(TAG, "request paused: " + url);
                    try {
                        Thread.sleep(100);
                    }
                    catch (InterruptedException e) {
                        Log.d(TAG, "request pause interrupted: " + url);
                    }
                }
            }

            // if Approov is still not initialized then forward the request unchanged
            if (!approovService.isInitialized()) {
                Log.d(TAG, "uninitialized forwarded: " + url);
                return chain.proceed(request);
            }
        }

        // check if the URL matches one of the exclusion regexs and just proceed without making
        // changes if so
        Map<String, Pattern> exclusionURLs = approovService.getExclusionURLRegexs();
        for (Pattern pattern: exclusionURLs.values()) {
            Matcher matcher = pattern.matcher(url);
            if (matcher.find()) {
                if (!approovService.isSuppressLoggingUnknownURL())
                    Log.d(TAG, "excluded url: " + url);
                return chain.proceed(request);
            }
        }

        // update the data hash based on any token binding header (presence is optional)
        String bindingHeader = approovService.getBindingHeader();
        if ((bindingHeader != null) && request.headers().names().contains(bindingHeader)) {
            Approov.setDataHashInToken(request.header(bindingHeader));
            Log.d(TAG, "setting data hash for binding header " + bindingHeader);
        }

        // request an Approov token for the domain and log unless suppressed
        Approov.TokenFetchResult approovResults = Approov.fetchApproovTokenAndWait(host);
        if (!approovService.isSuppressLoggingUnknownURL() || (approovResults.getStatus() != Approov.TokenFetchStatus.UNKNOWN_URL))
            Log.d(TAG, "token for " + host + ": " + approovResults.getLoggableToken());

        // force a pinning change if there is any dynamic config update, calling fetchConfig to
        // clear the update flag
        if (approovResults.isConfigChanged()) {
            Log.d(TAG, "dynamic config update received");
            Approov.fetchConfig();
            approovService.notifyPinChangeListeners();
        }

        // we cannot proceed if the pins need to be updated. We notify any certificate pinners that
        // they need to update. This might occur on first use after initial app install if the
        // initial network fetch was unable to obtain the dynamic configuration for the account if
        // there was poor network connectivity at that point.
        if (approovResults.isForceApplyPins()) {
            Log.d(TAG, "force apply pins asserted so aborting request");
            approovService.notifyPinChangeListeners();
            throw new IOException("Approov pins need to be updated");
        }

        // check the status of Approov token fetch
        if (approovResults.getStatus() == Approov.TokenFetchStatus.SUCCESS) {
            // we successfully obtained a token so add it to the header for the request
            String header = approovService.getTokenHeader();
            String prefix = approovService.getTokenPrefix();
            request = request.newBuilder().header(header, prefix + approovResults.getToken()).build();
        }
        else if ((approovResults.getStatus() == Approov.TokenFetchStatus.NO_NETWORK) ||
                 (approovResults.getStatus() == Approov.TokenFetchStatus.POOR_NETWORK) ||
                 (approovResults.getStatus() == Approov.TokenFetchStatus.MITM_DETECTED)) {
            // we are unable to get an Approov token due to network conditions so the request can
            // be retried by the user later - unless this is overridden
            if (!approovService.isProceedOnNetworkFail())
                throw new IOException("Approov token fetch for " + host + ": " + approovResults.getStatus().toString());
        }
        else if ((approovResults.getStatus() != Approov.TokenFetchStatus.NO_APPROOV_SERVICE) &&
                 (approovResults.getStatus() != Approov.TokenFetchStatus.UNKNOWN_URL) &&
                 (approovResults.getStatus() != Approov.TokenFetchStatus.UNPROTECTED_URL))
            // we have failed to get an Approov token with a more serious permanent error
            throw new IOException("Approov token fetch for " + host + ": " + approovResults.getStatus().toString());

        // we only continue additional processing if we had a valid status from Approov, to prevent additional delays
        // by trying to fetch from Approov again and this also protects against header substitutions in domains not
        // protected by Approov and therefore potential subject to a MitM
        if ((approovResults.getStatus() != Approov.TokenFetchStatus.SUCCESS) &&
            (approovResults.getStatus() != Approov.TokenFetchStatus.UNPROTECTED_URL))
            return chain.proceed(request);

        // we now deal with any header substitutions, which may require further fetches but these
        // should be using cached results
        Map<String, String> subsHeaders = approovService.getSubstitutionHeaders();
        for (Map.Entry<String, String> entry: subsHeaders.entrySet()) {
            String header = entry.getKey();
            String prefix = entry.getValue();
            String value = request.header(header);
            if ((value != null) && value.startsWith(prefix) && (value.length() > prefix.length())) {
                approovResults = Approov.fetchSecureStringAndWait(value.substring(prefix.length()), null);
                Log.d(TAG, "substituting header: " + header + ", " + approovResults.getStatus().toString());
                if (approovResults.getStatus() == Approov.TokenFetchStatus.SUCCESS) {
                    // substitute the header
                    request = request.newBuilder().header(header, prefix + approovResults.getSecureString()).build();
                }
                else if (approovResults.getStatus() == Approov.TokenFetchStatus.REJECTED)
                    // if the request is rejected then we provide a special exception with additional information
                    throw new IOException("Header substitution for " + header + ": " +
                            approovResults.getStatus().toString() + ": " + approovResults.getARC() +
                            " " + approovResults.getRejectionReasons());
                else if ((approovResults.getStatus() == Approov.TokenFetchStatus.NO_NETWORK) ||
                         (approovResults.getStatus() == Approov.TokenFetchStatus.POOR_NETWORK) ||
                         (approovResults.getStatus() == Approov.TokenFetchStatus.MITM_DETECTED)) {
                    // we are unable to get the secure string due to network conditions so the request can
                    // be retried by the user later - unless this is overridden
                    if (!approovService.isProceedOnNetworkFail())
                        throw new IOException("Header substitution for " + header + ": " +
                            approovResults.getStatus().toString());
                }
                else if (approovResults.getStatus() != Approov.TokenFetchStatus.UNKNOWN_KEY)
                    // we have failed to get a secure string with a more serious permanent error
                    throw new IOException("Header substitution for " + header + ": " +
                            approovResults.getStatus().toString());
            }
        }

        // we now deal with any query parameter substitutions, which may require further fetches but these
        // should be using cached results
        String currentURL = request.url().toString();
        Map<String, Pattern> queryParams = approovService.getSubstitutionQueryParams();
        for (Map.Entry<String, Pattern> entry: queryParams.entrySet()) {
            String queryKey = entry.getKey();
            Pattern pattern = entry.getValue();
            Matcher matcher = pattern.matcher(currentURL);
            if (matcher.find()) {
                // we have found an occurrence of the query parameter to be replaced so we look up the existing
                // value as a key for a secure string
                String queryValue = matcher.group(1);
                approovResults = Approov.fetchSecureStringAndWait(queryValue, null);
                Log.d(TAG, "substituting query parameter: " + queryKey + ", " + approovResults.getStatus().toString());
                if (approovResults.getStatus() == Approov.TokenFetchStatus.SUCCESS) {
                    // substitute the query parameter
                    currentURL = new StringBuilder(currentURL).replace(matcher.start(1),
                            matcher.end(1), approovResults.getSecureString()).toString();
                    request = request.newBuilder().url(currentURL).build();
                }
                else if (approovResults.getStatus() == Approov.TokenFetchStatus.REJECTED)
                    // if the request is rejected then we provide a special exception with additional information
                    throw new IOException("Query parameter substitution for " + queryKey + ": " +
                            approovResults.getStatus().toString() + ": " + approovResults.getARC() +
                            " " + approovResults.getRejectionReasons());
                else if ((approovResults.getStatus() == Approov.TokenFetchStatus.NO_NETWORK) ||
                         (approovResults.getStatus() == Approov.TokenFetchStatus.POOR_NETWORK) ||
                         (approovResults.getStatus() == Approov.TokenFetchStatus.MITM_DETECTED)) {
                    // we are unable to get the secure string due to network conditions so the request can
                    // be retried by the user later - unless this is overridden
                    if (!approovService.isProceedOnNetworkFail())
                        throw new IOException("Query parameter substitution for " + queryKey + ": " +
                            approovResults.getStatus().toString());
                }
                else if (approovResults.getStatus() != Approov.TokenFetchStatus.UNKNOWN_KEY)
                    // we have failed to get a secure string with a more serious permanent error
                    throw new IOException("Query parameter substitution for " + queryKey + ": " +
                            approovResults.getStatus().toString());
            }
        }

        // proceed with the rest of the chain
        return chain.proceed(request);
    }
}
