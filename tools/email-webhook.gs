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

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (!data || data.token !== SECRET_TOKEN) {
      return out_({ ok: false, error: "unauthorized" });
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

    GmailApp.sendEmail(to, subject, body, {
      name: String(data.fromName || "Batroun Race").slice(0, 80)
    });
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
