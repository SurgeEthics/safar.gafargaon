/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-afac4cd2'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "safar-logo.svg",
    "revision": "ebd7642024b539b469d5faeabcd03e3c"
  }, {
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "424b0ddeffc660c348dde536838f238f"
  }, {
    "url": "pwa-512x512.png",
    "revision": "b939c8f0cf4bf04e5f824257d38bc4ce"
  }, {
    "url": "pwa-192x192.png",
    "revision": "968e2740b061116784f61b61304a0e07"
  }, {
    "url": "index.html",
    "revision": "2f3ed597e984b3b2cddea4a37c9736f8"
  }, {
    "url": "icon.svg",
    "revision": "2656b652288f2dc2146deee1452b7349"
  }, {
    "url": "favicon.png",
    "revision": "c48568c4b5a6df7bf2c0bc060531dba0"
  }, {
    "url": "favicon.ico",
    "revision": "c91f4713b49633cff485a7bee25c82b4"
  }, {
    "url": "download.html",
    "revision": "e39dca1f6ea7cdb8bb9f8534aa6a7e89"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "9c56b5edc561a53f807b294c64b4234f"
  }, {
    "url": "assets/index-D_0C55oi.css",
    "revision": null
  }, {
    "url": "assets/index-CaR8FjqA.js",
    "revision": null
  }, {
    "url": "assets/drivers/tasnimul_kabeer.png",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "9c56b5edc561a53f807b294c64b4234f"
  }, {
    "url": "favicon.ico",
    "revision": "c91f4713b49633cff485a7bee25c82b4"
  }, {
    "url": "pwa-192x192.png",
    "revision": "968e2740b061116784f61b61304a0e07"
  }, {
    "url": "pwa-512x512.png",
    "revision": "b939c8f0cf4bf04e5f824257d38bc4ce"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "424b0ddeffc660c348dde536838f238f"
  }, {
    "url": "manifest.webmanifest",
    "revision": "28884cb39ce6d01034507bc3e2dc82ea"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html"), {
    denylist: [/^\/.*\.zip$/, /^\/api\/.*/]
  }));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
