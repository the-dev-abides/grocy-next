---
name: Test run
about: The result of one run of the QA regression tests in docs/qa/regression-tests.md
---

## The run

- Build (commit or tag):
- Device and browser:
- Tester:
- Date:

## The results

One row per case of `docs/qa/regression-tests.md`. Write `pass` or `fail`.

| Case   | Title                                                  | Result | Notes |
| ------ | ------------------------------------------------------ | ------ | ----- |
| QA-001 | Install the app from the manifest                      |        |       |
| QA-002 | Reject a pending scan with a swipe on the touch screen |        |       |
| QA-003 | Scan with the native decoder on the test phone         |        |       |
| QA-004 | Decode in the worker at speed on the test phone        |        |       |
| QA-005 | Hear and feel the scan feedback after the permission   |        |       |
| QA-006 | See the Open Facts image in the browser on the phone   |        |       |

## The failures

For each failed case: the case identifier, the step number, what happened,
and a screenshot when you have one.
