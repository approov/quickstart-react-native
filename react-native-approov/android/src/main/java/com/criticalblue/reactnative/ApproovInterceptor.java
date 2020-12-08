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

package com.criticalblue.reactnative;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

import android.util.Log;

import com.criticalblue.approovsdk.Approov;

import okhttp3.Interceptor;
import okhttp3.Request;
import okhttp3.Response;

public class ApproovInterceptor implements Interceptor {
    private final static String TAG = "ApproovInterceptor";
    private static final String APPROOV_HEADER = "Approov-Token";

    private ApproovModule approovModule;

    /**
     * Adds an Approov token to ntework requests.
     *
     * @param approovModule the Approov module.
     */
    public ApproovInterceptor(ApproovModule approovModule) {
        this.approovModule = approovModule;
    }

    @Override
    public Response intercept(Chain chain) throws IOException {
        // update the data hash based on any token binding header
        Request request = chain.request();

        // request an Approov token for the domain
        String host = request.url().host();
        Approov.TokenFetchResult approovResults = Approov.fetchApproovTokenAndWait(host);
        Log.i(TAG, "Approov Token for " + host + ": " + approovResults.getLoggableToken());

        // update dynamic configuration and pins
        if (approovResults.isConfigChanged()) {
            approovModule.updateConfig();
        }

        // check the status of Approov token fetch
        if (approovResults.getStatus() == Approov.TokenFetchStatus.SUCCESS) {
            // we successfully obtained a token so add it to the header for the request
            request = request.newBuilder().header(APPROOV_HEADER, approovResults.getToken()).build();
        } else if ((approovResults.getStatus() != Approov.TokenFetchStatus.NO_APPROOV_SERVICE) &&
                (approovResults.getStatus() != Approov.TokenFetchStatus.UNKNOWN_URL) &&
                (approovResults.getStatus() != Approov.TokenFetchStatus.UNPROTECTED_URL)) {
            // we have failed to get an Approov token in such a way that there is no point in proceeding
            // with the request - generally a retry is needed, unless the error is permanent
            throw new IOException("Approov token fetch failed: " + approovResults.getStatus().toString());
        }

        // proceed with the rest of the chain
        return chain.proceed(request);
    }
}

class ApproovLogInterceptor implements Interceptor {
    private static final String TAG = "Approov Interceptor";

    @Override
    public Response intercept(Interceptor.Chain chain) throws IOException {
        Request request = chain.request();

        long t1 = System.nanoTime();
        Log.i(TAG, String.format("Sending request %s on %s%n%s",
                request.url(), chain.connection(), request.headers()));

        Response response = chain.proceed(request);

        long t2 = System.nanoTime();
        Log.i(TAG, String.format("Received response for %s in %.1fms%n%s",
                response.request().url(), (t2 - t1) / 1e6d, response.headers()));

        return response;
    }
}
