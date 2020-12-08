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

import android.util.Log;

import com.criticalblue.approovsdk.Approov;

import java.io.IOException;
import java.util.List;
import java.util.Map;

import okhttp3.CertificatePinner;

public class ApproovCertificatePinner {
    private final static String TAG = "ApproovCertificatePinner";

    public static CertificatePinner build() {
        CertificatePinner.Builder builder = new CertificatePinner.Builder();
        Map<String, List<String>> pins = Approov.getPins("public-key-sha256");
        for (Map.Entry<String, List<String>> entry : pins.entrySet()) {
            for (String pin : entry.getValue()) {
                builder = builder.add(entry.getKey(), "sha256/" + pin);
                Log.i(TAG, "Adding OkHttp pin " + entry.getKey() + ":sha256/" + pin);
            }
        }

        return builder.build();
    }
}
