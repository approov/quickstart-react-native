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

import android.content.Context;
import android.util.Log;

import io.approov.service.ApproovService;
import okhttp3.Interceptor;
import okhttp3.Request;
import okhttp3.Response;

public class ApproovInterceptor implements Interceptor {
    private final static String TAG = "ApproovInterceptor";

    private static final String PROPS_NAME = "approov.props";

    private String tokenName;
    private String tokenPrefix;
    private boolean shouldBind;
    private String bindingName;

    // context for handling props
    private Context appContext;

    // service wrapping Approov SDK
    private ApproovService approovService;

    /**
     * Adds an Approov token to network requests.
     *
     * @param context the application context.
     * @param approovService the Approov service.
     */
    public ApproovInterceptor(Context context, ApproovService approovService) {
        this.appContext = context;
        this.approovService = approovService;

        setProps();
    }

    private void setProps() {
        String value;

        // try to load props

        Properties props = new Properties();
        try {
            props.load(appContext.getAssets().open(PROPS_NAME));
            Log.i(TAG, "Approov props read from file " + PROPS_NAME);
        } catch(Exception e){
            Log.e(TAG, "Approov props read failed: " +
                    e.getMessage() + ". Please make sure you have the file " + PROPS_NAME +
                    " available in your app's android/app/src/main/assets/ directory." +
                    " Using defaults.");
        }

        // update props

        value = props.getProperty("token.name");
        if (value == null) {
            tokenName = "Approov-Token";
        } else if (value.length() > 0) {
            tokenName = value;
        } else {
            tokenName = "Approov-Token";
            Log.e(TAG, "Illegal token.type in " + PROPS_NAME + "; using " + tokenName + " type.");
        }
        Log.i(TAG, "token.name: \'" + tokenName + "\'");

        value = props.getProperty("token.prefix");
        if (value == null || value.length() == 0) {
            tokenPrefix = "";
        } else {
            tokenPrefix = value + " ";
        }
        Log.i(TAG, "token.prefix: \'" + tokenPrefix + "\'");

        value = props.getProperty("binding.name");
        if (value == null || value.length() == 0) {
            bindingName = "";
            shouldBind = false;
        } else {
            bindingName = value;
            shouldBind = true;
        }
        Log.i(TAG, "binding.name: \'" + bindingName + "\'");
    }

    @Override
    public Response intercept(Chain chain) throws IOException {
        // update the data hash based on any token binding header
        Request request = chain.request();

        // bind token if appropriate
        if (shouldBind) {
            String data = request.header(bindingName);
            if (data != null) {
                Log.i(TAG, "Approov token binding to " + bindingName);
                if (data.length() >= 0) {
                    approovService.bindToken(data);
                } else {
                    Log.w(TAG, "Approov token not bound: empty " + bindingName + " header value");
                }
            } else {
                Log.w(TAG, "Approov token not bound: missing " + bindingName + "header");
            }
        }

        // request an Approov token for the domain (may throw IOException)
        String token = approovService.getToken(request.url().host());

        // if retry, then return status 503 to fetch
        if ("RETRY".equals(token)) {
            Response response = chain.proceed(chain.request());
            return response.newBuilder().code(503).message("Approov service not reached").build();
        }

        // if successful, add Approov token
        if (token.length() > 0) {
            request = request.newBuilder().header(tokenName, tokenPrefix + token).build();
        }

        // proceed with the rest of the chain
        return chain.proceed(request);
    }
}
