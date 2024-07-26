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

import com.facebook.react.modules.network.NetworkingModule.CustomClientBuilder;
import com.facebook.react.modules.network.ReactCookieJarContainer;

import android.content.Context;
import android.util.Log;

import okhttp3.CertificatePinner;
import okhttp3.Interceptor;
import okhttp3.OkHttpClient;

// ApproovClientBuilder is a custom client building for OkHttp to add Approov protection, including dynamic pinning
public class ApproovClientBuilder implements CustomClientBuilder, ApproovService.PinChangeListener {
    // underlying ApproovService that is wrapping the SDK
    private ApproovService approovService;

    // interceptor for adding Approov tokens or substituting headers and/or query parameters
    private Interceptor interceptor;

    // current certificate pinner to be used
    private CertificatePinner pinner;

    /**
     * Creates an ApproovClientBuilder for OkHttp requests. This adds the interceptor and certificate
     * pinning, which can be dynamically updated if the pins change during app usage.
     *
     * @param approovService is the ApproovService being used
     */
    public ApproovClientBuilder(ApproovService approovService) {
        this.approovService = approovService;
        
        // set initial certificate pinner
        pinner = ApproovCertificatePinner.build(approovService);

        // set the interceptor
        interceptor = new ApproovInterceptor(approovService);

        // listen for any future pinning changes
        approovService.addPinChangeListener(this);
    }

    /**
     * Handles a change to the Approov pins by creating a new pinner.
     */
    public void approovPinsUpdated() {
        pinner = ApproovCertificatePinner.build(approovService);
    }

    @Override
    public void apply(OkHttpClient.Builder builder) {
        if (builder != null) {
            builder.addInterceptor(interceptor).certificatePinner(pinner);
        }
    }
}
