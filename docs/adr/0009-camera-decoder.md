---
status: accepted
---

# The camera decoder

The scan screens read barcodes from the phone camera, one product after
another, with no stop. The decoder sets the scan code path for every stock
workflow. We decided on one interface, the `BarcodeDetector` interface, with
two decoders behind it: the native decoder of the browser where it reads every
format that the app needs, and ZXing-C++ in WebAssembly everywhere else.

## The decision

- The app talks to one interface, `BarcodeDetector`. The package
  `barcode-detector` 3.2.3 provides that interface over ZXing-C++ in
  WebAssembly. The app imports its ponyfill subpath, not its polyfill subpath,
  because the app makes the selection itself.
- Selection rule: when the scan screen opens, the app calls
  `getSupportedFormats()` on the native `BarcodeDetector`. If the list holds
  all seven formats below, the session uses the native decoder. Otherwise the
  session uses ZXing. A session never mixes the two decoders. Chrome on
  Android without Google Play Services has the constructor and an empty format
  list, so the constructor alone is not a test.
- The app serves the ZXing `.wasm` file from its own origin. The build copies
  the file from the package into the web app assets. The file is downloaded
  only in a session that picks ZXing.
- The app decodes in a Web Worker. Both decoders are available in a worker.
  The first scan screen prototype verifies the worker path on the test phone.
  If the worker path fails there, the fallback is the main thread.
- Frame clock: `requestVideoFrameCallback`, with one decode in flight at a
  time. A frame that arrives while a decode is in flight is skipped.
- Formats: `ean_13`, `ean_8`, `upc_a`, `upc_e`, `code_128`, `data_matrix`,
  and `qr_code`. Not Code 39, ITF, Aztec, PDF417, or Codabar. Data Matrix
  and Code 128 cover the two Grocycode print types. QR serves the re-order
  sheet later.
- Repeat rule: one barcode value is one scan while the decoder finds it in
  consecutive frames. The value becomes a new scan after it has been absent
  from the frames for 1 second. The gap is a constant in the code, not a user
  setting. The user scans the same item twice by moving it out of view and
  back.
- The scan screen shows which decoder is active in a small label. There is no
  switch that forces one decoder. The test phone exercises the native path,
  and a Linux desktop browser and the Playwright end-to-end test exercise the
  ZXing path.

## Considered options

- The native decoder only. Rejected: absent in Firefox, Windows, Linux, and
  iOS, and it needs Google Play Services on Android.
- ZXing only, through the ponyfill. Rejected by the maintainer in favour of
  the native decoder where it is present. The cost is two decoders with two
  behaviours in the field. The benefit is no download and hardware help on
  the devices that have the native decoder.
- `@zxing/library`, the JavaScript port. Rejected: slower per frame, and its
  own interface.
- `@undecaf/zbar-wasm`. Rejected: LGPL, and no release since 2024-05.
- A fixed repeat window of N seconds. Rejected: it blocks a fast second scan
  of the same item.

## Consequences

- A later milestone can measure the two decoders on real devices and change
  the selection rule with no change to the scan code.
- The research did not measure decode speed and did not test ZXing in a Web
  Worker. The first scan screen prototype closes both gaps.
- The two decoders can return different results for one damaged barcode. A
  bug report must name the active decoder. The label on the scan screen gives
  that.

## Sources

- The barcode scanning research on branch `research/barcode-scanning`.
- Ticket [#67](https://github.com/the-dev-abides/grocy-next/issues/67).
