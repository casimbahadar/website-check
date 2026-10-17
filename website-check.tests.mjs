// node website-check.tests.mjs
// Runs the CORE block from the shipped index.html against real Lighthouse 12.8.2 results saved as result-*.json:
// a deliberately flawed made-up bakery page, a well-built page, and two pages that failed to load.
import { readFileSync } from "node:fs";
const read = p => readFileSync(new URL(p, import.meta.url), "utf8");
const core = read("./index.html").split("/* CORE-START")[1].split("/* CORE-END */")[0].replace(/^[^\n]*\n/, "");
const C = new Function(core + "\nreturn Check;")();
const R = n => JSON.parse(read(`./result-${n}.json`));
let pass = 0, fail = 0;
const check = (name, cond, detail) => { if (cond) pass++; else { fail++; console.log("FAIL " + name + (detail !== undefined ? "  :: " + JSON.stringify(detail).slice(0, 300) : "")); } };
const bakery = C.build(R("bakery")), good = C.build(R("good"));
check("bakery scores: speed 75, accessibility 24, search 73, standards 82", JSON.stringify(bakery.scores.map(s => [s.id, s.score])) === JSON.stringify([["performance", 75], ["accessibility", 24], ["seo", 73], ["best-practices", 82]]), bakery.scores);
check("bakery bands: needs work, poor, needs work, needs work", bakery.scores.map(s => s.band).join() === "needs work,poor,needs work,needs work");
check("bakery top three, most serious first: not set up for phones, text too small, text too faint", JSON.stringify(bakery.top.map(f => f.id)) === JSON.stringify(["viewport", "font-size", "color-contrast"]), bakery.top.map(f => f.id));
check("bakery: 25 failing checks become 19 plain findings, with no topic twice", bakery.findings.length === 19 && new Set(bakery.findings.map(f => f.title)).size === 19, bakery.findings.length);
check("every finding has a title and a reason, with no leftover markup", bakery.findings.every(f => f.title && f.why && !/\]\(|`|undefined/.test(f.title + f.why + f.fix + f.detail)));
check("details read plainly: about 9.4 seconds, could save about 448 KB", bakery.findings.some(f => f.detail === "about 9.4 seconds") && bakery.findings.some(f => f.detail === "could save about 448 KB"));
check("serious problems come before minor ones", bakery.findings.every((f, i, a) => i === 0 || a[i - 1].impact >= f.impact));
check("the well-built page scores good in every category, with only minor findings", good.scores.every(s => s.band === "good") && good.findings.every(f => f.impact === 1) && good.findings.length <= 6, [good.scores, good.findings.length]);
check("a page that returned an error: plain message", C.build(R("404")).error.code === "errored_document_request" && /couldn't load that page/.test(C.build(R("404")).error.message));
check("a page blocked by a warning screen: plain message", C.build(R("interstitial")).error.code === "chrome_interstitial_error");
check("an empty result: plain message", !!C.build(null).error);
const noCats = R("bakery"); noCats.categories.seo.score = null;
check("a category without a score says it couldn't be measured", C.build(noCats).scores.find(s => s.id === "seo").band === "couldn't be measured");
const extra = R("good"); extra.audits["made-up-check"] = { id: "made-up-check", title: "Avoid `huge` [things](https://x)", description: "Big things are slow. [Learn more](https://y).", score: 0, scoreDisplayMode: "binary" };
extra.categories.performance.auditRefs.push({ id: "made-up-check", weight: 3, group: "" });
extra.audits["hidden-check"] = { id: "hidden-check", title: "Hidden", score: 0, scoreDisplayMode: "binary" }; extra.categories.performance.auditRefs.push({ id: "hidden-check", weight: 0, group: "hidden" });
const ex = C.build(extra);
check("a check the report doesn't know is still shown, in Google's words with markup removed", ex.findings.some(f => f.title === "Avoid huge things" && f.why === "Big things are slow."), ex.findings.map(f => f.title));
check("checks Google hides from its own report stay hidden", !ex.findings.some(f => f.title === "Hidden"));
// errors from the API
const E = (s, b) => C.explainError(s, b);
check("quota used up", E(429, { error: { message: "Quota exceeded" } }).code === "quota" && E(403, { error: { errors: [{ reason: "dailyLimitExceeded" }] } }).code === "quota");
check("access key refused", E(403, { error: { message: "API key not valid. Please pass a valid API key.", errors: [{ reason: "badRequest" }] } }).code === "key");
check("address that doesn't exist", E(500, { error: { message: "Lighthouse returned error: DNS_FAILURE. DNS servers could not resolve the provided domain." } }).code === "dns_failure");
check("page that won't load", E(500, { error: { message: "Lighthouse returned error: FAILED_DOCUMENT_REQUEST. Lighthouse was unable to reliably load the page" } }).code === "failed_document_request");
check("bad address and server trouble", E(400, { error: { message: "Invalid value" } }).code === "bad_url" && E(503, null).code === "server");
// addresses, checked before anything is sent
const N = C.normalizeUrl;
check("a bare domain gets https added", N("maplestreetbakery.example").url === "https://maplestreetbakery.example/" && N("maplestreetbakery.example").host === "maplestreetbakery.example");
check("spaces, capitals, www and a #section are tidied", N("  https://WWW.Example.com/menu#top ").url === "https://www.example.com/menu" && N("https://WWW.Example.com/menu#top").host === "example.com");
for (const bad of ["", "localhost:3000", "http://192.168.1.10", "10.0.0.5", "http://172.20.1.1", "printer.local", "javascript:alert(1)", "ftp://example.com", "https://user:pass@example.com", "not a url", "x".repeat(2100)])
  check(`refused before sending: "${bad.slice(0, 30)}"`, N(bad).ok === false && N(bad).message);
check("a public 172.32 address is allowed", N("http://172.32.0.1").ok === true);
const q = new URL(C.requestUrl("https://example.com/", ""));
check("the request asks for a phone test of all four categories", q.searchParams.get("strategy") === "MOBILE" && q.searchParams.getAll("category").sort().join() === "ACCESSIBILITY,BEST_PRACTICES,PERFORMANCE,SEO" && q.origin === "https://pagespeedonline.googleapis.com");
check("the key is only added when there is one", !q.searchParams.has("key") && new URL(C.requestUrl("https://example.com/", "abc")).searchParams.get("key") === "abc");
// the email summary
const s = C.summary(bakery, { name: "Maple Street Bakery", date: "October 16, 2026", link: "https://casimbahadar.github.io/website-check/", signature: "Casim" });
check("summary: scores, three numbered fixes, the caveat, the link and the signature", s.includes("Speed on a phone: 75 out of 100, needs work") && /\n1\. The site isn't set up for phones/.test(s) && /\n3\. /.test(s) && !/\n4\. /.test(s) && s.includes("not all") && s.includes("website-check") && s.endsWith("Casim") && !s.includes("undefined"), s);
const t0 = performance.now(); for (let i = 0; i < 500; i++) C.build(R("bakery")); const ms = performance.now() - t0;
check(`500 reports built in ${ms.toFixed(0)} ms (under 2,000)`, ms < 2000);
console.log(`\n${pass}/${pass + fail} tests passed`);
process.exit(fail ? 1 : 0);
