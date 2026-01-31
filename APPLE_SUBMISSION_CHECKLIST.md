Apple Submission Checklist — Repost Rocket (Current Build)

Scope
- Stabilization gate only (no new features)
- Mobile test pass, failure states, privacy disclosure

Mobile test pass (iOS Safari + iOS WebView)
- Upload 1–3 cards from camera roll (front-only + front/back) → analysis completes → Review loads → Launch loads
- Upload 10+ cards mixed order → no stuck "Analyzing…" and Review/Launch still reachable
- Slow network (low-power mode or throttled connection) → no infinite spinners; unknowns show "Reviewed"
- Background/foreground app while analyzing → no crash; flow resumes
- OCR failure path → Review still reachable; fields show Unknown + editable

Failure states (must be graceful)
- cardIntel_front returns error → UI shows Unknown (not endless Detecting)
- Missing front image → OCR skipped cleanly (no crash, no blocked UI)
- Back image missing → never blocks flow
- Netlify function errors → always JSON response, no connection reset

Privacy disclosure (App Store)
- State images are uploaded for OCR + analysis
- Disclose third-party processing (OpenAI)
- Document whether images are stored and for how long
- Provide data deletion/contact method
- Link to Privacy Policy in app and store listing

Submission readiness gate
- All mobile tests pass twice in a row
- No crash logs in console during the flow
- No infinite loading states
- Privacy policy updated and linked
