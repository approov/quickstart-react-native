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

import java.io.IOException;
import java.util.List;
import java.util.Map;

import io.approov.service.ApproovService;
import okhttp3.CertificatePinner;

public class ApproovCertificatePinner {
    private final static String TAG = "ApproovCertificatePinner";

    /**
     * Builds a new certificate pinner using the current Approov-registered certificates.
     * 
     * @param approovService
     * @return the certificate pinner.
     */
    public static CertificatePinner build(ApproovService approovService) {
        CertificatePinner.Builder pinBuilder = new CertificatePinner.Builder();
        Map<String, List<String>> allPins = approovService.getPins("public-key-sha256");
        for (Map.Entry<String, List<String>> entry : allPins.entrySet()) {
            String domain = entry.getKey();
            if (!domain.equals("*")) {
                // the * domain is for managed trust roots and should
                // not be added directly
                List<String> pins = entry.getValue();

                // if there are no pins then we try and use any managed trust roots
                if (pins.isEmpty() && (allPins.get("*") != null))
                    pins = allPins.get("*");

                // add the required pins for the domain
                for (String pin: pins) {
                    pinBuilder = pinBuilder.add(domain, "sha256/" + pin);
                    Log.i(TAG, "Adding OkHttp pin " + entry.getKey() + ":sha256/" + pin);
                }
            }
        }

        return pinBuilder.build();
    }
}
