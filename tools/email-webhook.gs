/**
 * Batroun Race — automatic email webhook (Google Apps Script)
 *
 * Sends registration / confirmation emails from YOUR Gmail account when the
 * registration site calls it. Deploy once as a Web App (see EMAIL-SETUP.md),
 * then paste the deployment URL + token into admin → Settings → Automatic
 * email.
 *
 * Gmail quota: ~100 recipients/day on a free @gmail.com account
 * (~1500/day on Google Workspace). DAILY_CAP below keeps a runaway
 * client (or an abuser who found the URL) from burning the whole quota.
 */

// Must match the token you paste into admin → Settings → Automatic email.
// Change it to any long random string before deploying.
const SECRET_TOKEN = "CHANGE-ME-to-a-long-random-string";

// Safety cap on how many emails this script will send per calendar day.
const DAILY_CAP = 120;

// Appended to the end of every EMAIL (WhatsApp is unaffected). Gmail's own
// saved signature is NOT applied by Apps Script, so set it here. Leave ""
// for no signature. \n = new line.
const SIGNATURE =
  "--\n" +
  "Batroun Race Team\n" +
  "batrounrace.com | @batrounrace\n" +
  "WhatsApp: +961 81 300 625";

// Visiting the web-app URL in a browser (a GET) shows a friendly status
// instead of Google's "unable to open the file" error — an easy health
// check that the deployment is alive. Sending always goes through doPost.
function doGet() {
  const props = PropertiesService.getScriptProperties();
  const key = "sent-" + new Date().toISOString().slice(0, 10);
  return out_({
    ok: true,
    service: "Batroun Race email webhook",
    sentToday: Number(props.getProperty(key) || 0),
    dailyCap: DAILY_CAP
  });
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (!data || data.token !== SECRET_TOKEN) {
      return out_({ ok: false, error: "unauthorized" });
    }

    // Bounce report: scan the mailbox for delivery-failure notices (wrong
    // address, mailbox full, domain doesn't exist...) from the last N days
    // and return the addresses they mention. Called by the admin's "Check
    // bounced emails" button.
    if (data.action === "bounces") {
      const days = Math.min(60, Math.max(1, Number(data.days) || 14));
      const me = Session.getEffectiveUser().getEmail().toLowerCase();
      const threads = GmailApp.search(
        "from:(mailer-daemon OR postmaster) newer_than:" + days + "d", 0, 50);
      const bounces = [];
      threads.forEach(function (t) {
        t.getMessages().forEach(function (m) {
          const bodyText = m.getPlainBody().slice(0, 5000);
          const found = bodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
          const uniq = found
            .map(function (a) { return a.toLowerCase(); })
            .filter(function (a, i, arr) {
              return arr.indexOf(a) === i
                && a !== me
                && !/mailer-daemon|postmaster|google\.com$|googlemail/.test(a);
            })
            .slice(0, 3);
          if (uniq.length) {
            bounces.push({
              date: m.getDate().toISOString().slice(0, 10),
              subject: m.getSubject().slice(0, 100),
              addresses: uniq
            });
          }
        });
      });
      return out_({ ok: true, bounces: bounces.slice(0, 50) });
    }

    const to = String(data.to || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return out_({ ok: false, error: "bad recipient" });
    }
    const subject = String(data.subject || "").slice(0, 200).trim();
    const body = String(data.body || "").slice(0, 8000).trim();
    if (!subject || !body) return out_({ ok: false, error: "empty message" });

    // Daily counter (resets by date key).
    const props = PropertiesService.getScriptProperties();
    const key = "sent-" + new Date().toISOString().slice(0, 10);
    const n = Number(props.getProperty(key) || 0);
    if (n >= DAILY_CAP) return out_({ ok: false, error: "daily cap reached" });

    // Duplicate guard: the identical email (same recipient + subject + body)
    // within 5 minutes is sent only ONCE — protects against browsers or
    // networks that fire the request twice.
    const cache = CacheService.getScriptCache();
    const sig = Utilities.base64Encode(Utilities.computeDigest(
      Utilities.DigestAlgorithm.MD5, to + "|" + subject + "|" + body,
      Utilities.Charset.UTF_8));
    if (cache.get(sig)) return out_({ ok: true, deduped: true });

    GmailApp.sendEmail(to, subject, body + (SIGNATURE ? "\n\n" + SIGNATURE : ""), {
      name: String(data.fromName || "Batroun Race").slice(0, 80)
    });
    cache.put(sig, "1", 300);
    props.setProperty(key, String(n + 1));

    return out_({ ok: true, sentToday: n + 1 });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  }
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
    .setContentType(ContentService.MimeType.JSON);
}
