# Device Guardian and media detector delivery

## Device Guardian
- Existing /device-guardian now opens connection methods rather than a symptom questionnaire.
- After consent, five automatic browser checks run: secure context, page transport, Web Crypto capability, embedding, and this origin's existing camera/microphone/location permission visibility. Queries do not request device access.
- Completed checks, unavailable OS check groups, evidence, severity, confidence and recommended actions are shown. OS coverage remains incomplete even if browser checks find no issues.
- Results exist only in component memory. Disconnect, navigation or reload clears them. No database, history, external scan API, payload logging or pairing tokens are used.
- No companion integration exists, so Android/Windows OS scans and QR/one-time pairing remain unavailable. No temporary pairing session is created or falsely revoked.

## Media detector
- /media-detector is linked from the existing home tools. Native file selection, drag/drop, local previews, removal/replacement, readable-media validation and camera capture are implemented.
- Local selection accepts JPEG/PNG/WEBP up to 10 MB, MP4/WEBM up to 15 MB and 60 seconds. These are conservative app preview limits, not verified Gemini acceptance limits.
- Camera uses getUserMedia after a user action; photos and silent videos use canvas/MediaRecorder. Tracks stop after capture, recording, close or unmount. Recorded WebM duration is repaired locally with logging disabled.
- Object URLs are revoked and media stays local. No database tables, public uploads, backend media copies or analysis results are created.
- Detector not configured is explicit. Analyze is disabled. No model is configured and no fabricated result or analysis progress is displayed.

## Changed files
- src/routes/device-guardian.tsx
- src/lib/browser-device-checks.ts
- src/test/browser-device-checks.test.ts
- src/routes/media-detector.tsx
- src/components/MediaCapture.tsx
- src/lib/media-validation.ts
- src/test/media-validation.test.ts
- src/routes/index.tsx (new tool link only)
- package.json and bun.lock (fix-webm-duration)
- AGENTS.md, roadmap.md, this document

## Required services and secrets
None were provisioned or deployed. No database migrations were added.
- Lovable Cloud must be enabled from the main project chat before implementing the requested Gemini backend or account features; it cannot be enabled in this draft.
- Obtain a Gemini Developer API key from https://aistudio.google.com/api-keys and save it securely as GEMINI_API_KEY from the main project chat. Never put it in client code or public variables.
- No Gemini model has been configured or tested. Current official documentation identifies gemini-3.8-flash as a candidate; verify live model access, exact image/video MIME support and terms before choosing it for deployment.
- Google quotas and free-tier availability depend on model/account/tier; verify in AI Studio and https://ai.google.dev/gemini-api/docs/pricing before proceeding. Do not promise a fixed free request count. Paid usage can incur token charges; no billing account or paid resource was created.
- Free-service media may be used to improve Google products; paid-service terms differ and may still include abuse-monitoring retention. Review https://ai.google.dev/gemini-api/terms and https://ai.google.dev/gemini-api/docs/zdr before consent. No immediate Google deletion guarantee.

## Still required for genuine analysis
From the main project chat: implement a private server-side Gemini endpoint with MIME/signature/size/duration validation, explicit Google consent, abuse protection, structured four-category assessments, accurate completed-check disclosures and terminal error handling. Use actual supported video input or a disclosed sampled-frame pipeline; never claim unchecked audio/metadata were analyzed. Avoid public storage and logs; delete any temporary provider files as applicable under provider rules. Test real successful/inconclusive responses, missing keys, rate limits, provider failures and cleanup before release. No API request has been executed here.

## Executed verification
- 20 tests across browser-device-checks, device-assessment, media-validation and app-routing passed.
- Browser: Guardian consent gate, real automatic checks, zero scan network requests during check, disconnect clearing, Windows unavailable connection and 390px layout passed. No runtime errors.
- Browser: real JPEG and WebM upload decoding, unsupported/oversized/corrupt rejection, remove and reload clearing, desktop/390px layouts passed.
- Browser camera: real browser API exercised with a simulated Chromium camera; photo capture and video recording with duration repair passed, and tracks stopped. Controlled permission-denied branch and no-camera error passed. Physical hardware behavior remains unverified.
- Home navigation to media detector passed. Latest automated build reports build OK.
- Not tested: Gemini requests/results, provider limits/errors/retention cleanup, physical camera devices, OS companion scans or secure pairing (not configured).

## Manual release checks
1. Accept the draft to move frontend changes into the main project; accepting does not configure Gemini, Cloud or a companion.
2. On a real phone/computer, choose valid and invalid media, replace/remove it, and verify preview clearing.
3. Grant/deny camera permission; capture a photo, retake, record/stop a short video and close the camera. Confirm camera indicator turns off.
4. Verify Guardian consent, unavailable OS coverage and disconnect clearing.
5. After implementing/configuring Gemini from main, test real image/video analysis through result display and provider failure paths. Publish only after those checks; no deployment was performed here.
