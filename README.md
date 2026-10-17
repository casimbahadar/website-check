# Free website check

Enter a web address and get a short report, in plain words, on how the site works on a phone and what to fix first. Built by Casim Bahadar, Phoenix Applications & Automations.

Live: https://casimbahadar.github.io/website-check/

## What it does

The page sends the address to Google's free PageSpeed Insights API, which runs Lighthouse on a simulated phone over a mobile connection. It checks four things: speed, accessibility, search engine basics, and current standards. The page then turns the results into a report:

- four scores out of 100, each with a plain band: good (90 and up), needs work (50 to 89) or poor (under 50)
- the three things to fix first, each with why it matters to the business and what to do
- everything else the check found, grouped by area
- a reminder that automated checks catch many problems but not all, and that results vary a little between runs
- a sign-off with a contact link

The report can be printed or saved as a PDF, or a short summary can be copied for an email. An optional business name puts the report under that name. "See a sample report" shows a report for a made-up bakery website, with no network request.

## How the findings are worded

About 35 common Lighthouse checks have a plain-language version, saying what the problem is, why it matters to a business, and what to do. Checks that measure the same thing are merged into one finding. Serious problems come first, in a set order, so that "the site isn't set up for phones" comes before the small text and tiny buttons it causes. Any other failing check that counts towards a score still appears, in Google's own wording with its links and code formatting removed.

## Privacy

Only the web address goes to Google, which loads that page the way a phone would. Nothing is saved. The page's security settings let it talk to Google's checker and nowhere else. Every result is shown as plain text, never run as code. Addresses that Google couldn't reach anyway are refused before anything is sent: private, local and non-web ones, and ones containing a username or password.

## The Google key

The page works without a key, but then it shares a quota with everyone else, so checks can fail. With a free key, the page gets its own 25,000 checks a day. Google says its keys are safe to include in a page address, and this one should be restricted so it only works for this service and only from this site.

To create one:
1. Sign in at console.cloud.google.com and create a project.
2. In APIs & Services, then Library, search for PageSpeed Insights API and enable it.
3. In APIs & Services, then Credentials, choose Create credentials, then API key.
4. Edit the key. Under Application restrictions, choose Websites and add `casimbahadar.github.io/*`. Under API restrictions, choose Restrict key and select only PageSpeed Insights API. Save.

The key then goes into the page's build (`PSI_KEY=... python3 build.py`), which produces `index.html`.

## Files

- `index.html`: the whole page. The report logic sits between the `CORE-START` and `CORE-END` markers.
- `website-check.tests.mjs`: checks a developer can run with Node (`node website-check.tests.mjs`). They use real Lighthouse 12.8.2 results saved in `result-*.json`:
  - a deliberately flawed made-up bakery page
  - a well-built page
  - a page that returned an error
  - a page blocked by a warning screen
- `.nojekyll`: tells GitHub Pages to serve the files as they are.

## How AI was used to build this

The page was written with an AI coding assistant. It was checked by:
- the tests above
- headless browser tests, with Google's checker stubbed by the real results, covering every error type and the printed PDF
- a UI audit at three screen widths
- a security scan

No AI runs on the page itself. The checks are Google's Lighthouse.
