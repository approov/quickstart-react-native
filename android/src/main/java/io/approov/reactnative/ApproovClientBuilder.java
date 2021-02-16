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

import io.approov.service.ApproovService;

import com.facebook.react.modules.network.NetworkingModule.CustomClientBuilder;
import com.facebook.react.modules.network.ReactCookieJarContainer;

import android.content.Context;
import android.util.Log;

import okhttp3.CertificatePinner;
import okhttp3.Interceptor;
import okhttp3.OkHttpClient;

public class ApproovClientBuilder implements CustomClientBuilder, ApproovService.Listener {
    private final String TAG = "ApproovClientBuilder";

    private Interceptor interceptor;
    private CertificatePinner pinner;

    /**
     * Creates an Approov client builder.
     * 
     * This builder adds an approov interceptor to API requests and sets the initial certificate pins.
     * The builder updates the certificate pins on any Approov service changes.
     *
     * @param context the app context.
     * @param approovService the Approov service.
     */
    public ApproovClientBuilder(Context context, ApproovService approovService) {
        // set initial certificate pinner
        pinner = ApproovCertificatePinner.build(approovService);

        // set interceptor
        interceptor = new ApproovInterceptor(context, approovService);

        // listen for any service changes
        approovService.addListener(this);
    }

    /**
     * Handles an Approov service change.
     * 
     * Certificate pins are updated.
     * 
     * @param approovService the Approov service.
     */
    public void approovServiceChanged(ApproovService approovService) {
        pinner = ApproovCertificatePinner.build(approovService);
    }

    public void apply(OkHttpClient.Builder builder) {
        if (builder == null) return;

        Log.d(TAG, "Applying Approov custom client builder");

        builder.cookieJar(new ReactCookieJarContainer())
        .addInterceptor(interceptor)
        .certificatePinner(pinner);
    }
}
