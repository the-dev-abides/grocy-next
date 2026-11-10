---
status: accepted
---

# The end-to-end test environment

The scan screens read the camera, and every screen reaches Grocy and the
online lookup through the Next API. An end-to-end test needs a camera, a
Grocy, and an Open Food Facts, with no device and no network. We decided on a
fake camera in Chromium with checked-in barcode pictures, Imposter as the one
stand-in for every external service, the real Next API in every test, and a
QA regression test document for the paths that no test can reach.

## The decision

- The end-to-end tests are automated only. No test waits on a person.
- The camera path is tested on Chromium only, with the Chromium fake camera:
  the flags `--use-fake-ui-for-media-stream`,
  `--use-fake-device-for-media-stream`, and
  `--use-file-for-fake-video-capture`. The fake camera plays a checked-in
  file. Firefox has only a built-in test pattern, and WebKit has no fake
  camera. The camera tests skip on the other two Playwright projects.
- The camera file is one JPEG per test barcode, checked in under the
  end-to-end project. Chromium reads a single JPEG as a one-frame MJPEG file
  and loops it. A JPEG of one barcode is under one kilobyte. A Y4M file of
  one frame at 1280 by 720 is 1.4 megabytes and needs ffmpeg. A script next
  to the files regenerates them with the ZXing writer.
- The camera test asserts four facts: the camera starts when the screen
  opens, the label names the active decoder and the thread, the barcode in
  the file becomes one pending scan row, and the row stays one row while the
  barcode stays in view. The 1 second repeat gap of ADR 0009 is a unit test,
  because one looping frame never leaves the view.
- The native decoder has no fake path. Playwright Chromium on Linux has no
  native decoder, so the end-to-end test runs ZXing. The native path is a
  QA case on the test phone.
- Imposter is the one stand-in for every external service: Grocy and Open
  Food Facts now, Mealie later. No end-to-end test mocks an external service
  in the browser with a route handler. The Next API itself is never mocked
  in an end-to-end test.
- Imposter runs as the native engine, one Go binary, through the Imposter
  CLI. The CLI version and the engine version are pinned in the Imposter
  project configuration file. CI downloads the pinned CLI release and checks
  its checksum.
- The Grocy mock uses the Grocy OpenAPI file from the reference folder as its
  specification. Each Grocy call that the API makes has one static JSON
  response file, matched on path and query. A booking returns a fixed stock
  log row and changes nothing: the mock holds no state, because the
  end-to-end tests assert Grocy Next, not Grocy. Request validation against
  the OpenAPI schema is on. Where the OpenAPI file differs from the Grocy
  code, the build turns validation off for that one resource with a comment.
- The Open Food Facts mock is a second Imposter mock with the v3 response for
  the unknown test code. The API reads the Open Facts base URL from an
  environment variable; see ADR 0011.
- The fixture is a small household: two or three locations, one store, two
  product groups, three products with real EAN-13 codes and the names as
  printed on the package, each with a product barcode, and one unknown code
  with an Open Food Facts record. No name in the fixture identifies a real
  household. The to-spec run picks the codes.
- The Playwright `webServer` list starts three processes: the two Imposter
  mocks, the API, and the web app. Each runs on a port of its own, not on
  3000 and not on 4200. The API uses a SQLite file in a temporary folder.
  Playwright never reuses a server that already runs, so a dev server
  against a real Grocy is never touched by a test.
- One CI job, `e2e`, installs Chromium with its system packages and runs the
  Chromium project on every pull request. Firefox and WebKit stay out of CI.
- A QA regression test document at `docs/qa/regression-tests.md` holds the
  cases that no automated test reaches. Each case has an identifier, a title,
  the preconditions, numbered steps, one expected result per step, and the
  device or browser. The pull request that adds or changes a behaviour
  updates the cases in the same pull request. A test run is one GitHub issue
  from an issue template, with the build, the device, the tester, and pass
  or fail per case. The repo document holds no run history. The first cases
  are the native decoder on the test phone.

## Considered options

- No end-to-end test of the camera, with a manual check only. Rejected: a
  regression in the camera strip, the worker, or the repeat rule then
  reaches the phone first.
- A Y4M file built in the test with ffmpeg. Rejected: a one-frame JPEG does
  the same with no tool and a file a thousand times smaller.
- A route handler in the browser that fakes the Next API or Grocy. Rejected:
  the test then skips the API, which is where the resolution, the merge of a
  repeat scan, and the lookup queue live.
- A stateful Grocy mock with scripts. Rejected: it tests the mock, not Grocy
  Next.
- The Imposter JVM engine or the Docker image. Rejected: both need a second
  runtime, and both start slower than the native binary.
- The online lookup off in the end-to-end tests. Rejected: the "New product"
  path then has no test.
- The Playwright config as it was, with the reuse of the dev server on port
  4200. Rejected: a dev server against a real Grocy would take the test
  bookings.

## Consequences

- A test that needs a new Grocy call adds one response file to the mock.
- The four places where the Grocy OpenAPI file differs from the Grocy code,
  found in the Grocy API research, become per-resource validation
  exceptions in the mock config.
- Playwright Chromium on macOS may have the native decoder. The camera test
  asserts the decode, not the decoder, so it passes on both, and the label
  in the test output says which one ran.
- The Imposter CLI is one more tool on a developer machine. The development
  documentation names it.

## Sources

- Ticket [#83](https://github.com/the-dev-abides/grocy-next/issues/83).
- The purchase scan screen prototype on branch `prototype/purchase-scan-screen`.
- The Grocy API research on branch `research/grocy-api-review-queue`.
