# CSEC Physics response endpoint

The website works locally without a server. Leave `window.WB_CONFIG.endpoint` blank in `config.js` to keep answers on the student's device. To enable teacher submissions, deploy the Apps Script below as a web app.

## Set up the response spreadsheet

1. Create a new Google Sheet for the class responses.
2. In that sheet, choose **Extensions → Apps Script**.
3. Replace the editor contents with `Physics_Responses.gs` and save.
4. In **Project Settings**, set the time zone to **America/Port_of_Spain** if desired.
5. Choose **Deploy → New deployment → Web app**.
6. Set **Execute as** to **Me**. Set **Who has access** to **Anyone** so the static student site can submit without Google sign-in.
7. Deploy, authorize the script, then copy the web app URL ending in `/exec`.
8. Paste that URL into `config.js` as the `endpoint` value and publish the updated site.

The script creates `Responses` and `Mocks` sheets on the first matching submission. Both receive a header row, timestamp and an idempotency key; repeated deliveries with the same submission ID are ignored. Lesson submissions are written to `Responses`; Paper 01/Paper 02 mock results and their section breakdowns are written to `Mocks`. Answers and mark ticks are stored as JSON in the final column.

## Verify deployment

- Open the `/exec` URL in a browser; it should return “CSEC Physics response endpoint ready.”
- On the deployed student site, finish a lesson and submit a mock using a test student name.
- Confirm a new row appears in the corresponding sheet, including its JSON answers.
- Do not use real student names during the test.

The client sends `text/plain` JSON with `fetch(..., { mode: "no-cors" })` to avoid a browser CORS preflight. Browsers intentionally hide the response body/status in this mode, so the client can retry network failures but cannot read application-level errors from the web app response. If a request appears sent but no row arrives, check **Apps Script → Executions** and the spreadsheet permissions before asking students to use it. The browser keeps failed network sends in the local retry queue.

## Privacy and access

“Anyone” access is required for anonymous student submissions; the `/exec` URL is not an authentication secret. Share the spreadsheet only with authorized staff, use test data while validating, and follow school policy for student data. Do not put tutor answer keys, session notes or other private material in the public website repository. `noindex` is not access control.
