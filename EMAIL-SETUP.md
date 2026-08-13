# Automatic email setup (one-time, ~5 minutes)

Emails are sent from **your own Gmail account** through a tiny Google Apps
Script — free, no server, no credit card. Once set up:

- **Runner registers** → they instantly receive the "registration received —
  pay via Whish" email with their reference and payment link.
- **You tap Confirm** → the confirmation email with bib number and ticket
  link sends itself in the same click.

WhatsApp stays one-tap (pre-filled, you press Send) — that's a WhatsApp
policy limit, not ours.

## Step 1 — Create the script

1. Open **script.google.com** while signed in to the Gmail account the
   emails should come from (e.g. `Batrounrace@gmail.com`).
2. **New project** → delete the sample code → paste the whole contents of
   [`tools/email-webhook.gs`](tools/email-webhook.gs) from this repo.
3. In the pasted code, change `SECRET_TOKEN` from `CHANGE-ME…` to any long
   random string (e.g. mash the keyboard for 30 characters). Keep a copy.
4. Name the project (top-left) e.g. `Batroun Race emails` and save (💾).

## Step 2 — Deploy it as a web app

1. **Deploy → New deployment**.
2. Click the gear next to "Select type" → **Web app**.
3. Description: anything. **Execute as: Me**. **Who has access: Anyone**.
4. **Deploy** → Google asks you to authorize → allow (it needs permission to
   send email as you).
5. Copy the **Web app URL** (looks like
   `https://script.google.com/macros/s/AKfycb…/exec`).

## Step 3 — Connect it to the admin

1. Open the admin → **Settings** tab → **Automatic email** card.
2. Paste the **Web app URL** and the **secret token** from step 1.3.
3. Tick which sends you want automatic:
   - *after registration* (payment-request email to the runner), and/or
   - *on payment confirm* (confirmation + ticket email).
4. **Save**, then press **Send test email** — a test lands in your own inbox
   within seconds if everything is wired.

## Notes & limits

- Free Gmail sends to ~**100 recipients/day** (Workspace ~1500/day). The
  script also has its own safety cap (`DAILY_CAP`, default 120) so nothing
  can burn the quota in one go. On a heavy promo day, the manual email
  button still works as a fallback.
- The email texts are the same templates as WhatsApp (admin → Theme & copy),
  with all placeholders (`{name}`, `{ref}`, `{link}`, `{bib}`, `{ticket}`,
  `{event}`, …) resolved.
- **To change the token later**: edit it in the script, **Deploy → Manage
  deployments → edit → Version: New version**, and update it in admin
  Settings too.
- The webhook URL + token are readable by anyone who digs into the page
  config, so an abuser could in theory send emails from your Gmail until the
  daily cap stops them. The random URL makes that unlikely; if it ever
  happens, redeploy with a new URL + token (2 minutes) and update Settings.
