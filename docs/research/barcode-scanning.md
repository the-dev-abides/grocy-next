# Research: continuous barcode scanning in the browser

Ticket: [#9](https://github.com/the-dev-abides/grocy-next/issues/9).
Date: 2026-11-01.
All package versions come from `npm view <name> version` on that date.

## Question

How does a browser app scan barcodes without a stop between scans? The ticket
asks for five parts:

1. The Barcode Detection API and its browser support.
2. zxing-wasm and the other WebAssembly decoders, with versions.
3. Hardware scanner input as a keyboard wedge, and how to tell it from typing.
4. The Vibration API and audio feedback on iOS and Android.
5. What a PWA (Progressive Web App) needs for camera access.

## Summary

- The native Barcode Detection API works in Chrome on Android, macOS, and
  ChromeOS. It does not work in Firefox. Safari has it behind a flag only.
  Chrome on Android needs Google Play Services. The app cannot depend on it.
- zxing-wasm 3.1.6 decodes every format that the household needs in every
  browser. The package barcode-detector 3.2.3 wraps it in the same
  `BarcodeDetector` interface as the native API. One code path serves both.
- A hardware scanner is a USB or Bluetooth keyboard to the browser. No web API
  reports the source device of a key event. The app tells a scan from typing
  by the time between key events and by a configured suffix key.
- Vibration works in Chrome on Android after a user gesture. It does not work
  in Safari on iOS, and WebKit opposes the API. Audio works on both after a
  user gesture, when the app creates the `AudioContext` inside that gesture.
- Camera access needs HTTPS, a `camera` permissions policy, and a user
  permission prompt. Safari supports camera access in home screen web apps
  since iOS 13.4. Third-party iOS browsers got it in iOS 14.3.

## Findings

### 1. The Barcode Detection API

**What it is.** The `BarcodeDetector` interface is part of the WICG (Web
Platform Incubator Community Group) specification "Accelerated Shape Detection
in Images". The specification is a Draft Community Group Report. It states:
"It is not a W3C Standard nor is it on the W3C Standards Track."
([spec](https://wicg.github.io/shape-detection-api/))

**Interface.** The constructor takes an optional `formats` list. The static
method `getSupportedFormats()` returns the formats that the platform can
detect. If the browser does not support detection, the promise resolves with
an empty array. The method `detect(image)` returns a list of `DetectedBarcode`
objects with `rawValue`, `format`, `boundingBox`, and `cornerPoints`. The
formats are `aztec`, `code_128`, `code_39`, `code_93`, `codabar`,
`data_matrix`, `ean_13`, `ean_8`, `itf`, `pdf417`, `qr_code`, `upc_a`,
`upc_e`, and `unknown`. The spec says: "The list of supported BarcodeFormats
is platform dependent." ([spec](https://wicg.github.io/shape-detection-api/))

**Input types.** MDN lists `HTMLImageElement`, `SVGImageElement`,
`HTMLVideoElement`, `HTMLCanvasElement`, `ImageBitmap`, `OffscreenCanvas`,
`VideoFrame`, `Blob`, and `ImageData` as accepted inputs. The API needs a
secure context. It is available in Web Workers.
([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Barcode_Detection_API))

**Continuous use.** The detector takes one frame per call. A continuous scan
loop calls `detect()` on the `<video>` element once per frame. The method
`requestVideoFrameCallback()` runs a callback for each new video frame, at the
lower of the video frame rate and the paint rate. It is Baseline since
October 2024: Chrome 83, Safari 15.4, Firefox 132.
([MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback),
[BCD](https://github.com/mdn/browser-compat-data/blob/main/api/HTMLVideoElement.json))
Chrome's own documentation warns: "don't rely on realtime detection, but
rather allow for some time for the detector to do its work."
([Chrome docs](https://developer.chrome.com/docs/capabilities/shape-detection))

**Browser support.** The MDN browser compat data (BCD) gives this table.
([BCD](https://github.com/mdn/browser-compat-data/blob/main/api/BarcodeDetector.json),
[caniuse](https://caniuse.com/mdn-api_barcodedetector))

| Browser | Support |
|---|---|
| Chrome for Android | Since 83. Needs Google Play Services. |
| Chrome desktop | Since 88, partial: "Supported on ChromeOS and macOS only." |
| Edge, Opera desktop | Partial: "Supported on macOS only." |
| Firefox | Not supported. Open bug 1553738. |
| Safari 17 and later | Behind the preference "Shape Detection API". |
| Safari on iOS | Mirrors Safari: disabled by default. |

**How Chrome implements it.** The Chromium build file shows one implementation
per platform. On macOS the service uses the Vision framework. On Android the
service is Java and depends on `google_play_services_vision_java`. The Android
provider returns `null` when Google Play Services is absent or older than
19.7.42, with the log "Google Play Services not available". Builds without a
platform detector use a stub that answers "Platform not supported for Barcode
Detection Service." and returns an empty format list.
([BUILD.gn](https://chromium.googlesource.com/chromium/src/+/main/services/shape_detection/BUILD.gn),
[BarcodeDetectionProviderImpl.java](https://source.chromium.org/chromium/chromium/src/+/main:services/shape_detection/android/java/src/org/chromium/shape_detection/BarcodeDetectionProviderImpl.java),
[barcode_detection_provider_impl.cc](https://source.chromium.org/chromium/chromium/src/+/main:services/shape_detection/barcode_detection_provider_impl.cc))

Since 2025 the Chromium source has a second path, `build_with_internal_shape_detection`.
The build argument is true for Chrome-branded builds on ChromeOS, Linux, and
Windows. It links a closed-source Chrome shape detection library.
([features.gni](https://source.chromium.org/chromium/chromium/src/+/main:services/shape_detection/features.gni))
I could not verify that this path has shipped in a stable Chrome release. BCD
and the Chrome documentation still list macOS, ChromeOS, and Android only.
Treat Windows and Linux desktop support as absent.

**Feature detection.** Chrome's documentation says that a check for the
constructor is not enough. The app must call `getSupportedFormats()` and
check for the formats it needs. A device without Google Play Services has the
constructor and an empty format list.
([Chrome docs](https://developer.chrome.com/docs/capabilities/shape-detection))

### 2. WebAssembly and JavaScript decoders

| Package | Version | Last publish | License | Engine | Note |
|---|---|---|---|---|---|
| `zxing-wasm` | 3.1.6 | 2026-10-19 | MIT (zxing-cpp: Apache-2.0) | ZXing-C++ via WebAssembly | Reader-only WASM binary is about 1.04 MiB. |
| `barcode-detector` | 3.2.3 | 2026-10-19 | MIT | zxing-wasm | Polyfill and ponyfill of `BarcodeDetector`. |
| `@undecaf/zbar-wasm` | 0.11.0 | 2024-05-22 | LGPL-2.1+ | ZBar via WebAssembly | No release in 17 months. Copyleft license. |
| `@zxing/library` | 0.23.0 | 2026-04-29 | Apache-2.0 | TypeScript port of ZXing | Pure JavaScript. Slower than WASM. |
| `@zxing/browser` | 0.2.1 | 2026-07-06 | MIT | `@zxing/library` | Camera layer for the TypeScript port. |
| `@ericblade/quagga2` | 1.13.0 | 2026-10-21 | MIT | Own JavaScript | 1D formats. QR through a plugin. |
| `html5-qrcode` | 2.3.8 | 2023-04-15 | Apache-2.0 | `@zxing/library` | No release in 3.5 years. |
| `jsqr` | 1.4.0 | 2025-11-13 | Apache-2.0 | Own JavaScript | QR codes only. |

Source for each row: `npm view <name> version time.modified license`.

**zxing-wasm.** The README describes the package as "ZXing-C++ WebAssembly as
an ES/CJS module with types". It reads all linear formats that grocery stock
uses: EAN-8, EAN-13, UPC-A, UPC-E, Code 128, Code 39, ITF, and the DataBar
family. It also reads QR Code, Data Matrix, Aztec, and PDF417. The subpath
`zxing-wasm/reader` gives a read-only build. The function `readBarcodes()`
accepts a `Blob`, `File`, `ArrayBuffer`, `Uint8Array`, or `ImageData`. The
`.wasm` binary loads on the first call, from a jsDelivr CDN URL by default.
The app overrides `locateFile` in `prepareZXingModule()` to serve the binary
from its own origin. The README says: "Each version of this library has a
unique corresponding `.wasm` file."
([README](https://github.com/Sec-ant/zxing-wasm))

The reader options and their defaults, from the source:
`tryHarder: true`, `tryRotate: true`, `tryInvert: true`,
`tryDownscale: true`, `maxNumberOfSymbols: 255`, `binarizer: "LocalAverage"`,
`textMode: "HRI"`, `eanAddOnSymbol: "Ignore"`. A camera loop sets
`maxNumberOfSymbols: 1` and a short `formats` list to reduce work per frame.
([readerOptions.ts](https://github.com/Sec-ant/zxing-wasm/blob/main/src/bindings/readerOptions.ts))

**barcode-detector.** The README calls it "A Barcode Detection API
ponyfill/polyfill that uses ZXing-C++ WebAssembly under the hood." The
`polyfill` subpath registers `BarcodeDetector` on the global object when none
exists. The `ponyfill` subpath exports the class without a side effect. The
polyfill "doesn't try to augment the existing implementation with all the
barcode formats supported by this package." The package re-exports
`prepareZXingModule` and `ZXING_WASM_VERSION` so the app can self-host the
binary. The README says this matters "when a Content Security Policy restricts
serving paths or when offline use is needed."
([README](https://github.com/Sec-ant/barcode-detector))

**Worker use.** Decoding in a Web Worker keeps the camera preview smooth.
`OffscreenCanvas` is available in Web Workers and is Baseline since March
2023. The main thread draws the video frame to a canvas, reads `ImageData`,
and posts it to the worker. The worker calls `readBarcodes()`.
([MDN](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas))
The zxing-wasm README does not state Web Worker support. I did not test it.

**Duplicate results.** A camera loop sees the same barcode in many frames in
a row. The app must keep the last decoded value and a timestamp, and must skip
a repeat inside a short window. The specification and the libraries do not do
this. This is an app rule.

### 3. Hardware scanner as a keyboard wedge

**What the browser sees.** A USB or Bluetooth scanner in "USB HID Keyboard"
mode is a keyboard to the operating system. The browser gets `keydown` and
`keyup` events for each character and a final suffix key. Zebra's reference
guide documents the suffix: "This parameter adds an Enter key (carriage
return or line feed) after scanned data." A Tab key is a second option. The
guide also documents one prefix and up to two suffix values, with the default
suffix `7013 <CR><LF>`.
([Zebra RS6100 guide](https://docs.zebra.com/us/en/mobile-computers/wearable/rs6-series/rs6100-product-reference-guide/user-preferences-and-miscellaneous-options/miscellaneous-scanner-parameters.html),
[Zebra DS4208 quick start](https://www.zebra.com/content/dam/support-dam/en/documentation/unrestricted/guide/product/13923003a_ds4208-qsg-en.pdf))

**No device identity.** The `KeyboardEvent` interface has `key`, `code`,
`repeat`, and `isComposing`. It has no field for the source device. MDN
documents no way to find the device.
([MDN](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent))
WebHID could open a device directly, but it is Chrome desktop only (since 89)
and absent on Android, Firefox, and Safari.
([BCD](https://github.com/mdn/browser-compat-data/blob/main/api/HID.json))
I could not fetch the WebHID blocklist text to confirm that keyboards are
protected. The platform gap rules it out in any case.

**How to tell a scan from typing.** Two signals, used together:

1. **Timing.** A scanner sends a whole code in a burst. A person types one
   character at a time with pauses. `Event.timeStamp` gives each event's time
   in milliseconds from the time origin. Chrome rounds it to 0.1 ms, Safari
   and Firefox to 1 ms. Firefox with `privacy.resistFingerprinting` rounds to
   16.667 ms. ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Event/timeStamp))
   The app buffers characters whose gap is below a threshold and treats the
   buffer as a scan when a suffix key arrives. The threshold is an app
   setting. No standard defines it.
2. **Suffix and prefix.** The app treats Enter or Tab as the end of a scan.
   A configured prefix character, set on the scanner, marks the start. The
   prefix removes false positives from fast typists.

**Where to listen.** A document-level `keydown` listener catches scans while
no input has focus. When an input has focus, the scan goes into that input.
The app must decide the rule for each screen. On a phone, a Bluetooth scanner
in keyboard mode can hide the on-screen keyboard. That is operating system
behavior, not a web API matter.

### 4. Feedback: vibration and sound

**Vibration API.** The W3C specification says: "It is not expected to advance
to W3C Recommendation in its current form." The `vibrate()` method returns
`false` and stops when the document is not visible or when the global object
does not have sticky activation. A pattern is at most 10 entries, each at most
10000 ms. ([spec](https://w3c.github.io/vibration/))

| Browser | Support |
|---|---|
| Chrome for Android | Since 32. Since Chrome 60 it needs a user gesture; otherwise it returns `false`. |
| Android WebView | Since 4.4.3, same gesture rule since 60. |
| Firefox for Android | Since 79 the call returns `true` but no vibration takes place. |
| Firefox desktop | Removed in 129. |
| Safari, Safari on iOS | Not supported. |

([BCD](https://github.com/mdn/browser-compat-data/blob/main/api/Navigator.json))
WebKit's standards position is "oppose", set on 2023-11-14. The reason given:
"it wouldn't even be possible to support this API on Apple's native
platforms."
([WebKit position](https://github.com/WebKit/standards-positions/issues/267))
There is no web API for haptics on iOS. The app must give sound and an
on-screen alert on iOS, and vibration only where `navigator.vibrate` exists.

**Audio.** Browsers block audio that starts without a user gesture. MDN's
Web Audio best practices say: "if you create the audio context from inside a
`click` event the state should automatically be set to `running`." A context
created outside a gesture starts `suspended` and needs `resume()` inside a
later gesture.
([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices))
The autoplay guide says playback with audio "is generally blocked if the
playback is programmatically initiated in a tab which has not yet had any
user interaction."
([MDN](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay))
WebKit on iOS requires that `play()` results from a handler for `touchend`,
`click`, `doubleclick`, or `keydown`.
([WebKit blog](https://webkit.org/blog/6784/new-video-policies-for-ios/))
On iOS Safari the context state becomes `"interrupted"` when the user leaves
the page. The app must check for that state and call `resume()` again.
([MDN](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/state))

For the scan workflow this means: the "Start scanning" tap creates or resumes
one `AudioContext`. Each scan result then plays a short tone from that
context. A keyboard-wedge scan is a `keydown` event, which counts as a user
gesture, so sound works there too.

### 5. Camera access in a PWA

**Secure context.** MDN states: "`getUserMedia()` is a powerful feature that
can only be used in secure contexts; in insecure contexts,
`navigator.mediaDevices` is `undefined`". A secure context is HTTPS,
`localhost`, or a `file:` URL. The deployment must serve the app over HTTPS,
also on the home network.
([MDN](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia))
The specification marks `MediaDevices` with `[SecureContext]`.
([spec](https://w3c.github.io/mediacapture-main/))

**Permissions policy.** The `camera` directive controls access. The header
`Permissions-Policy: camera=(self)` allows the document and same-origin
frames. A denied policy, an insecure page, or a user refusal all give
`NotAllowedError`. No matching camera gives `NotFoundError`.
([MDN](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia))
The Permissions API lists `camera` as a permission name for a status query.
([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Permissions_API))

**Rear camera.** The `facingMode` constraint takes `user`, `environment`,
`left`, or `right`. The value `environment` is "facing away from the user".
The constraint `{ facingMode: { exact: "environment" } }` requires the rear
camera. ([spec](https://w3c.github.io/mediacapture-main/),
[MDN](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia))

**Torch and focus.** The Image Capture specification defines `torch` as the
fill light "staying on as long as track is active" and `focusMode` with the
value `continuous`. Both are an Editor's Draft.
([spec](https://w3c.github.io/mediacapture-image/),
[MDN](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints))
I could not get a browser support table for `torch`. The MDN page for it
returns 404 and the BCD file is absent. Treat torch as an optional extra.

**Manifest.** The manifest `display` member takes `fullscreen`,
`standalone`, `minimal-ui`, or `browser`. `standalone` opens the app "to look
and feel like a standalone native app" without the URL bar.
([MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/display))

**iOS.** WebKit bug 185448, "getUserMedia not working in apps added to home
screen that run in standalone mode", was marked fixed on 2020-02-06. The fix
shipped in iOS 13.4.
([WebKit bug 185448](https://bugs.webkit.org/show_bug.cgi?id=185448))
WebKit bug 208667 covers third-party iOS browsers, which use `WKWebView`. A
comment on 2020-11-19 reports success on iOS 14.3, and the bug closed on
2021-01-05 with "WKWebView applications can now have access to getUserMedia."
([WebKit bug 208667](https://bugs.webkit.org/show_bug.cgi?id=208667))
I did not verify how iOS persists the camera permission between launches of a
home screen web app.

**Android.** Chrome for Android and Android WebView support `getUserMedia`
since Chrome 47. ([BCD](https://github.com/mdn/browser-compat-data/blob/main/api/Navigator.json))
A PWA installed from Chrome runs in Chrome and keeps the camera permission as
a site permission.

## Comparison

Decoder options for the camera path.

| Option | Formats | Platforms | Cost | Benefit |
|---|---|---|---|---|
| Native `BarcodeDetector` only | Platform list; EAN and UPC on Android and macOS | Chrome Android, Chrome macOS and ChromeOS, Safari behind a flag | No Firefox, no Windows, no Linux, no iOS. Needs Google Play Services. | No download. Hardware acceleration. |
| `zxing-wasm` only | All linear and matrix formats | Every browser with WebAssembly | About 1 MiB download, cached after the first load. CPU decode. | One behavior everywhere. Self-hosted. |
| `barcode-detector` polyfill over native | Native where present, ZXing elsewhere | Every browser | Two decoders with two format lists and two behaviors in the field. | Smaller download on supported devices. |
| `barcode-detector` ponyfill only | ZXing everywhere | Every browser | Same download as `zxing-wasm`. | Standard `BarcodeDetector` interface. Swap to native later without a code change. |
| `@zxing/library` | All ZXing formats | Every browser | Pure JavaScript, slower per frame. | No WASM file. |
| `@undecaf/zbar-wasm` | 1D and QR | Every browser | LGPL. No release since 2024-05. | Small binary. |

## Recommendation

Use the `barcode-detector` ponyfill, version 3.2.3, as the one decoder for the
camera path. It gives the standard `BarcodeDetector` interface with ZXing-C++
behind it in every browser. Serve the `.wasm` file from the app origin through
`prepareZXingModule`. Decode in a Web Worker with `requestVideoFrameCallback`
as the frame clock. Do not use the native detector in the first version. The
native detector is absent in Firefox, Windows, Linux, and iOS, and it depends
on Google Play Services on Android. A later ticket can test the native path
against the ponyfill on real devices and switch per platform if it proves
faster.

Treat hardware scanners as keyboard input. Detect a scan by a time gap
threshold plus an Enter or Tab suffix. Make the threshold and a prefix
character user settings.

For the alert on an unknown barcode, play a tone from one `AudioContext` that
the "Start scanning" tap creates. Call `navigator.vibrate` when it exists.
Always show the on-screen alert. iOS gets sound and the alert only.

Serve the app over HTTPS in every deployment and set
`Permissions-Policy: camera=(self)`. Request the rear camera with
`facingMode: "environment"`.

This is a proposal. The maintainer decides.

## Sources

- WICG, Accelerated Shape Detection in Images: https://wicg.github.io/shape-detection-api/
- MDN, Barcode Detection API: https://developer.mozilla.org/en-US/docs/Web/API/Barcode_Detection_API
- MDN BCD, BarcodeDetector: https://github.com/mdn/browser-compat-data/blob/main/api/BarcodeDetector.json
- caniuse, BarcodeDetector: https://caniuse.com/mdn-api_barcodedetector
- Chrome docs, Shape Detection API: https://developer.chrome.com/docs/capabilities/shape-detection
- Chromium, services/shape_detection/BUILD.gn: https://chromium.googlesource.com/chromium/src/+/main/services/shape_detection/BUILD.gn
- Chromium, features.gni: https://source.chromium.org/chromium/chromium/src/+/main:services/shape_detection/features.gni
- Chromium, BarcodeDetectionProviderImpl.java: https://source.chromium.org/chromium/chromium/src/+/main:services/shape_detection/android/java/src/org/chromium/shape_detection/BarcodeDetectionProviderImpl.java
- Chromium, barcode_detection_provider_impl.cc: https://source.chromium.org/chromium/chromium/src/+/main:services/shape_detection/barcode_detection_provider_impl.cc
- MDN, requestVideoFrameCallback: https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback
- MDN BCD, HTMLVideoElement: https://github.com/mdn/browser-compat-data/blob/main/api/HTMLVideoElement.json
- zxing-wasm repository: https://github.com/Sec-ant/zxing-wasm
- zxing-wasm reader options source: https://github.com/Sec-ant/zxing-wasm/blob/main/src/bindings/readerOptions.ts
- zxing-wasm on npm: https://www.npmjs.com/package/zxing-wasm
- barcode-detector repository: https://github.com/Sec-ant/barcode-detector
- barcode-detector on npm: https://www.npmjs.com/package/barcode-detector
- @undecaf/zbar-wasm on npm: https://www.npmjs.com/package/@undecaf/zbar-wasm
- @zxing/library on npm: https://www.npmjs.com/package/@zxing/library
- @zxing/browser on npm: https://www.npmjs.com/package/@zxing/browser
- @ericblade/quagga2 on npm: https://www.npmjs.com/package/@ericblade/quagga2
- html5-qrcode on npm: https://www.npmjs.com/package/html5-qrcode
- jsqr on npm: https://www.npmjs.com/package/jsqr
- MDN, OffscreenCanvas: https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas
- MDN, KeyboardEvent: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent
- MDN, Event.timeStamp: https://developer.mozilla.org/en-US/docs/Web/API/Event/timeStamp
- MDN BCD, HID: https://github.com/mdn/browser-compat-data/blob/main/api/HID.json
- Zebra, RS6100 Product Reference Guide, miscellaneous scanner parameters: https://docs.zebra.com/us/en/mobile-computers/wearable/rs6-series/rs6100-product-reference-guide/user-preferences-and-miscellaneous-options/miscellaneous-scanner-parameters.html
- Zebra, DS4208 Quick Start Guide: https://www.zebra.com/content/dam/support-dam/en/documentation/unrestricted/guide/product/13923003a_ds4208-qsg-en.pdf
- W3C, Vibration API: https://w3c.github.io/vibration/
- MDN BCD, Navigator (vibrate, mediaDevices): https://github.com/mdn/browser-compat-data/blob/main/api/Navigator.json
- WebKit standards position, Vibration API: https://github.com/WebKit/standards-positions/issues/267
- MDN, Web Audio API best practices: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices
- MDN, Autoplay guide: https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay
- MDN, BaseAudioContext.state: https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/state
- WebKit blog, New video policies for iOS: https://webkit.org/blog/6784/new-video-policies-for-ios/
- MDN, getUserMedia: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
- W3C, Media Capture and Streams: https://w3c.github.io/mediacapture-main/
- W3C, MediaStream Image Capture: https://w3c.github.io/mediacapture-image/
- MDN, MediaTrackConstraints: https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints
- MDN, Permissions API: https://developer.mozilla.org/en-US/docs/Web/API/Permissions_API
- MDN, manifest display: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/display
- WebKit bug 185448: https://bugs.webkit.org/show_bug.cgi?id=185448
- WebKit bug 208667: https://bugs.webkit.org/show_bug.cgi?id=208667
