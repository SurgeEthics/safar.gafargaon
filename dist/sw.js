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

  importScripts("/sw-notifications.js");
  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "sw-notifications.js",
    "revision": "8f0c1867db9095413975f27c6142879d"
  }, {
    "url": "safar-official-logo-1024.png",
    "revision": "31bc09ae281b7b34d75e42572e5fece4"
  }, {
    "url": "safar-logo.png",
    "revision": "31bc09ae281b7b34d75e42572e5fece4"
  }, {
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "31bc09ae281b7b34d75e42572e5fece4"
  }, {
    "url": "pwa-512x512.png",
    "revision": "31bc09ae281b7b34d75e42572e5fece4"
  }, {
    "url": "pwa-192x192.png",
    "revision": "cd332f3b6ee195106fd36942ae891050"
  }, {
    "url": "notification-icon.png",
    "revision": "31bc09ae281b7b34d75e42572e5fece4"
  }, {
    "url": "notification-badge.svg",
    "revision": "7f3f578586a60d223824c0c02ddd0280"
  }, {
    "url": "notification-badge.png",
    "revision": "4f259985a88b2ce4c97516974f561755"
  }, {
    "url": "logo.png",
    "revision": "31bc09ae281b7b34d75e42572e5fece4"
  }, {
    "url": "index.html",
    "revision": "0858ba8b224703281a05948ffbd472f9"
  }, {
    "url": "icon-maskable-512.png",
    "revision": "31bc09ae281b7b34d75e42572e5fece4"
  }, {
    "url": "icon-maskable-192.png",
    "revision": "cd332f3b6ee195106fd36942ae891050"
  }, {
    "url": "icon-512.png",
    "revision": "31bc09ae281b7b34d75e42572e5fece4"
  }, {
    "url": "icon-192.png",
    "revision": "cd332f3b6ee195106fd36942ae891050"
  }, {
    "url": "favicon.png",
    "revision": "cd332f3b6ee195106fd36942ae891050"
  }, {
    "url": "favicon.ico",
    "revision": "b169b14ae8b32af959c1cf2548c5f673"
  }, {
    "url": "driver_voice_male.mp3",
    "revision": "3e129d16de8b76d237d48b67662831c1"
  }, {
    "url": "download.html",
    "revision": "9326b4054d27bffe2ed8e90cbe0e5f8a"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "cd332f3b6ee195106fd36942ae891050"
  }, {
    "url": "assets/index-BmDjLSfM.js",
    "revision": null
  }, {
    "url": "assets/index-BhFjf_2V.css",
    "revision": null
  }, {
    "url": "assets/drivers/tasnimul_kabeer.png",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "cd332f3b6ee195106fd36942ae891050"
  }, {
    "url": "favicon.ico",
    "revision": "b169b14ae8b32af959c1cf2548c5f673"
  }, {
    "url": "pwa-192x192.png",
    "revision": "cd332f3b6ee195106fd36942ae891050"
  }, {
    "url": "pwa-512x512.png",
    "revision": "31bc09ae281b7b34d75e42572e5fece4"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "31bc09ae281b7b34d75e42572e5fece4"
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
