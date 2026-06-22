# Supabase Auth Emails via Resend — Setup Guide

This guide walks you through sending **all Supabase authentication emails** (sign-up confirmation, password reset, etc.) through **Resend** instead of Supabase’s built-in mailer.

### Why do this?

Supabase’s default email service has a low rate limit (roughly **3–4 emails per hour** on the free tier). That breaks real flows quickly — multiple sign-ups, password resets, or testing.

Resend gives you:

- Much higher sending limits (100/day on free, scales on paid plans)
- Delivery through your own domain (`noreply@apexmanager.app`)
- Branded HTML templates with your logo
- The same Resend account you already use for the contact form

---

## Overview

```
User signs up / resets password
        ↓
Supabase Auth generates the secure link
        ↓
Supabase sends the email using YOUR custom SMTP (Resend)
        ↓
User receives branded ApexManager email
        ↓
User clicks link → your app (/register confirm or /reset-password)
```

You do **not** need to change app code for the basic setup. Supabase still generates the magic links; Resend only delivers the emails.

---

## Prerequisites

Before you start, confirm you have:

| Item | Where |
|------|--------|
| Resend account | [resend.com](https://resend.com) |
| `RESEND_API_KEY` in Vercel | Already set for contact form |
| Domain `apexmanager.app` | Your production domain |
| Supabase project | [supabase.com/dashboard](https://supabase.com/dashboard) |
| App URL env var | `VITE_APP_URL` (e.g. `https://apexmanager.app`) |

---

## Part 1 — Resend domain & sender setup

### Step 1.1 — Verify `apexmanager.app` in Resend

1. Log in to [Resend → Domains](https://resend.com/domains).
2. Click **Add Domain** → enter `apexmanager.app`.
3. Resend shows DNS records (SPF, DKIM, optional DMARC). Add them in your domain registrar (where you bought the domain).
4. Wait for status **Verified** (usually 5–30 minutes, sometimes up to 48h).

> **Already verified?** If contact form emails from `noreply@apexmanager.app` work, skip to Step 1.2.

Typical records Resend asks for:

| Type | Name | Value |
|------|------|--------|
| TXT | `@` or `apexmanager.app` | SPF record Resend provides |
| CNAME | `resend._domainkey` | DKIM key Resend provides |
| TXT (optional) | `_dmarc` | `v=DMARC1; p=none;` (start permissive) |

### Step 1.2 — Choose your auth sender address

Use the same pattern as your contact form:

```
ApexManager <noreply@apexmanager.app>
```

This address must be on the **verified domain**. Do not use `@gmail.com` or Supabase’s default sender.

### Step 1.3 — Note your Resend SMTP credentials

Resend exposes SMTP for any service (including Supabase):

| Setting | Value |
|---------|--------|
| **Host** | `smtp.resend.com` |
| **Port** | `465` (SSL) or `587` (STARTTLS) — **587 recommended** |
| **Username** | `resend` |
| **Password** | Your Resend API key (`re_xxxxxxxx…`) — same as `RESEND_API_KEY` |

> The API key acts as the SMTP password. You can reuse the key already in Vercel, or create a dedicated key in Resend → API Keys (recommended: name it `supabase-smtp`).

---

## Part 2 — Host your logo for email clients

Email clients **do not reliably render SVG**. Use a PNG hosted on your public site.

### Step 2.1 — Use an existing PNG (quickest)

Your app already ships:

```
https://apexmanager.app/icons/icon-192.png
```

Use this URL in templates below. Replace the domain if your production URL differs.

### Step 2.2 — Optional: dedicated email logo (recommended)

For sharper branding in email, add a wider asset:

1. Export a **PNG** (~120×40 px or 240×80 px @2x) with icon + “ApexManager” wordmark on transparent or dark background.
2. Save as `public/images/email-logo.png` in the repo.
3. Deploy so it is available at:

```
https://apexmanager.app/images/email-logo.png
```

**Use this URL in all templates below** once deployed.

---

## Part 3 — Configure Supabase SMTP (Resend)

### Step 3.1 — Open SMTP settings

1. [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. Go to **Project Settings** (gear icon) → **Authentication**.
3. Scroll to **SMTP Settings** (or **Authentication → Email → SMTP** depending on dashboard version).
4. Enable **Custom SMTP**.

### Step 3.2 — Enter Resend details

| Field | Value |
|-------|--------|
| **Sender email** | `noreply@apexmanager.app` |
| **Sender name** | `ApexManager` |
| **Host** | `smtp.resend.com` |
| **Port** | `587` |
| **Minimum interval between emails** | `0` (or `1` second) |
| **Username** | `resend` |
| **Password** | `re_your_api_key_here` |

Click **Save**.

### Step 3.3 — Send a test email

In the same Auth settings area (or **Authentication → Users**):

1. Create a test user, or use **Send password recovery** on an existing test account.
2. Check inbox + spam.
3. In [Resend → Emails](https://resend.com/emails), confirm the message appears as **delivered**.

If it fails:

- Domain not verified → finish Part 1.
- Wrong API key → regenerate in Resend and update Supabase.
- Port blocked → try port `465` instead of `587`.

---

## Part 4 — Configure Supabase URL settings

Auth links must point to your app, not `localhost`.

### Step 4.1 — Site URL

**Authentication → URL Configuration**

| Setting | Value |
|---------|--------|
| **Site URL** | `https://apexmanager.app` |

### Step 4.2 — Redirect URLs (allow list)

Add every URL users may land on after clicking an email link:

```
https://apexmanager.app/**
https://apexmanager.app/reset-password
https://apex-manager-zeta.vercel.app/reset-password
http://localhost:5173/reset-password
```

Include Vercel preview/production URLs you use for testing.

---

## Part 5 — Email confirmation setting

**Authentication → Providers → Email**

| Setting | Recommendation |
|---------|----------------|
| **Enable Email provider** | ON |
| **Confirm email** | ON for production (users must verify inbox) |
| **Secure email change** | ON |
| **Double confirm email changes** | ON (optional, safer) |

With **Confirm email** ON:

- `signUp()` returns `session: null` → your app shows the “Check your inbox” screen ✅
- User clicks link in email → Supabase confirms → user can sign in

With **Confirm email** OFF:

- User gets a session immediately on sign-up (your app’s instant-login path)

Both flows work with the templates below.

---

## Part 6 — Paste branded email templates

Go to **Authentication → Email Templates** in Supabase.

For each template:

1. Set **Subject** (copy from below).
2. Paste **HTML body** into the template editor.
3. Save.

Supabase uses **Go template** variables. Do not remove `{{ .ConfirmationURL }}` — that is the secure link.

### Template variables reference

| Variable | Used in | Meaning |
|----------|---------|---------|
| `{{ .ConfirmationURL }}` | Confirm signup, Reset password | Full clickable link |
| `{{ .Email }}` | All | User’s email address |
| `{{ .SiteURL }}` | All | Your Site URL from settings |
| `{{ .Token }}` | OTP templates | 6-digit code (if using OTP) |

---

### Template A — Confirm sign-up

**Supabase template name:** `Confirm signup`

**Subject:**
```
Confirm your ApexManager account
```

**HTML body:** (copy everything below)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Confirm your ApexManager account</title>
</head>
<body style="margin:0;padding:0;background-color:#0D0D12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0D0D12;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;background-color:#16161F;border:1px solid #2A2A36;border-radius:16px;overflow:hidden;">
          <!-- Header / Logo -->
          <tr>
            <td align="center" style="padding:32px 32px 24px;">
              <img src="https://apexmanager.app/icons/icon-192.png" width="48" height="48" alt="ApexManager" style="display:block;border-radius:10px;" />
              <p style="margin:12px 0 0;font-size:20px;line-height:1.2;letter-spacing:-0.3px;">
                <span style="color:#F0F0F8;font-weight:700;">Apex</span><span style="color:#863bff;font-weight:300;">Manager</span>
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:0 32px 8px;">
              <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#F0F0F8;text-align:center;">
                Confirm your email
              </h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#8A8A9A;text-align:center;">
                Thanks for signing up! Tap the button below to verify
                <strong style="color:#F0F0F8;">{{ .Email }}</strong>
                and activate your account.
              </p>
            </td>
          </tr>
          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding:8px 32px 24px;">
              <a href="{{ .ConfirmationURL }}"
                 style="display:inline-block;background-color:#7C5CFC;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:10px;box-shadow:0 4px 16px rgba(124,92,252,0.35);">
                Confirm email address
              </a>
            </td>
          </tr>
          <!-- Fallback link -->
          <tr>
            <td style="padding:0 32px 24px;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#55556A;text-align:center;">
                Button not working? Copy and paste this link into your browser:<br />
                <a href="{{ .ConfirmationURL }}" style="color:#7C5CFC;word-break:break-all;">{{ .ConfirmationURL }}</a>
              </p>
            </td>
          </tr>
          <!-- Divider -->
          <tr>
            <td style="padding:0 32px;">
              <hr style="border:none;border-top:1px solid #2A2A36;margin:0;" />
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px 28px;">
              <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#55556A;text-align:center;">
                If you didn&apos;t create an ApexManager account, you can safely ignore this email.
              </p>
              <p style="margin:0;font-size:12px;line-height:1.6;color:#55556A;text-align:center;">
                Need help? <a href="mailto:support@apexmanager.app" style="color:#7C5CFC;text-decoration:none;">support@apexmanager.app</a>
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:24px 0 0;font-size:11px;color:#55556A;text-align:center;">
          © ApexManager · Business intelligence for your venue
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

### Template B — Reset password (forgot password)

**Supabase template name:** `Reset password` (sometimes labeled **Recovery**)

**Subject:**
```
Reset your ApexManager password
```

**HTML body:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your ApexManager password</title>
</head>
<body style="margin:0;padding:0;background-color:#0D0D12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0D0D12;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;background-color:#16161F;border:1px solid #2A2A36;border-radius:16px;overflow:hidden;">
          <!-- Header / Logo -->
          <tr>
            <td align="center" style="padding:32px 32px 24px;">
              <img src="https://apexmanager.app/images/email-logo.png" width="48" height="48" alt="ApexManager" style="display:block;border-radius:10px;" />
              <p style="margin:12px 0 0;font-size:20px;line-height:1.2;letter-spacing:-0.3px;">
                <span style="color:#F0F0F8;font-weight:700;">Apex</span><span style="color:#863bff;font-weight:300;">Manager</span>
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:0 32px 8px;">
              <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#F0F0F8;text-align:center;">
                Reset your password
              </h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#8A8A9A;text-align:center;">
                We received a request to reset the password for
                <strong style="color:#F0F0F8;">{{ .Email }}</strong>.
                Click below to choose a new password.
              </p>
            </td>
          </tr>
          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding:8px 32px 24px;">
              <a href="{{ .ConfirmationURL }}"
                 style="display:inline-block;background-color:#7C5CFC;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:10px;box-shadow:0 4px 16px rgba(124,92,252,0.35);">
                Reset password
              </a>
            </td>
          </tr>
          <!-- Security note -->
          <tr>
            <td style="padding:0 32px 16px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F5A62322;border:1px solid #F5A62344;border-radius:10px;">
                <tr>
                  <td style="padding:12px 16px;">
                    <p style="margin:0;font-size:12px;line-height:1.5;color:#F5A623;text-align:center;">
                      ⏱ This link expires in 1 hour. For security, it can only be used once.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Fallback link -->
          <tr>
            <td style="padding:0 32px 24px;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#55556A;text-align:center;">
                Button not working? Copy and paste this link into your browser:<br />
                <a href="{{ .ConfirmationURL }}" style="color:#7C5CFC;word-break:break-all;">{{ .ConfirmationURL }}</a>
              </p>
            </td>
          </tr>
          <!-- Divider -->
          <tr>
            <td style="padding:0 32px;">
              <hr style="border:none;border-top:1px solid #2A2A36;margin:0;" />
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px 28px;">
              <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#55556A;text-align:center;">
                If you didn&apos;t request a password reset, ignore this email — your password will stay the same.
              </p>
              <p style="margin:0;font-size:12px;line-height:1.6;color:#55556A;text-align:center;">
                Need help? <a href="mailto:support@apexmanager.app" style="color:#7C5CFC;text-decoration:none;">support@apexmanager.app</a>
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:24px 0 0;font-size:11px;color:#55556A;text-align:center;">
          © ApexManager · Business intelligence for your venue
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

### Optional — Portuguese subjects (same HTML)

If most users are Portuguese, you can localize **subjects only** (body stays English), or duplicate templates manually:

| Template | PT Subject |
|----------|------------|
| Confirm signup | `Confirme a sua conta ApexManager` |
| Reset password | `Repor a palavra-passe ApexManager` |

Full PT HTML localization can be added later via an Auth Hook (advanced).

---

## Part 7 — End-to-end testing checklist

### Sign-up confirmation

- [ ] Register a **new** email on `/register`
- [ ] App shows **“Check your inbox”** screen
- [ ] Email arrives from `ApexManager <noreply@apexmanager.app>`
- [ ] Logo displays correctly (not broken image)
- [ ] **Confirm email address** button works
- [ ] After confirm, user can sign in at `/signin`
- [ ] Email visible in Resend dashboard as **Delivered**

### Forgot password

- [ ] Go to `/signin` → **Forgot password?**
- [ ] Enter email → **“Check your inbox”** for reset
- [ ] Email arrives with branded template
- [ ] **Reset password** button opens `/reset-password` on your app
- [ ] Set new password → success screen → sign in works
- [ ] Resend dashboard shows delivery

### Rate limit check

- [ ] Send 5+ auth emails within an hour (different test addresses)
- [ ] All deliver (no Supabase “email rate limit exceeded” errors)

---

## Part 8 — Troubleshooting

| Problem | Likely cause | Fix |
|---------|--------------|-----|
| No email received | SMTP not saved / wrong key | Re-check Part 3; verify in Resend logs |
| “Email rate limit exceeded” | Still using Supabase default SMTP | Enable **Custom SMTP** and save |
| Email in spam | Domain not warmed up / missing DKIM | Complete DNS in Resend; add DMARC |
| Broken logo image | SVG used, or wrong URL | Use PNG URL from Part 2 |
| Reset link goes to wrong site | Site URL misconfigured | Part 4 — set Site URL + redirect URLs |
| “Invalid or expired link” | Link already used or >1h old | Request new reset; check clock skew |
| Link opens app but no session | Redirect URL not in allow list | Add `/reset-password` to redirect URLs |

---

## Part 9 — Resend limits (reference)

| Plan | Typical limit |
|------|----------------|
| Free | 100 emails / day, 3,000 / month |
| Pro | 50,000+ / month (scales with usage) |

Auth emails are low volume compared to marketing. Free tier is usually enough early on.

Monitor usage: [Resend → Usage](https://resend.com/overview)

---

## Part 10 — Advanced: Auth Hook + Resend API (optional)

Use this **only** if you need:

- Fully bilingual email bodies (EN + PT) chosen by user locale
- Dynamic content from your database
- Complete decoupling from Supabase template editor

Flow:

1. Supabase **Auth Hook** (`send_email` event) → Edge Function
2. Edge Function calls `resend.emails.send()` (same as `api/contact.js`)
3. Disable Supabase’s built-in email for that event

This requires code in `supabase/functions/auth-email/` and hook registration in the dashboard. **Not needed** for most apps — custom SMTP + HTML templates (Parts 3 & 6) is enough.

---

## Quick reference — copy/paste values

```
SMTP Host:     smtp.resend.com
SMTP Port:     587
SMTP User:     resend
SMTP Password: re_your_api_key
Sender:        ApexManager <noreply@apexmanager.app>

Site URL:      https://apexmanager.app
Reset URL:     https://apexmanager.app/reset-password

Logo URL:      https://apexmanager.app/icons/icon-192.png
Support:       support@apexmanager.app
Brand purple:  #7C5CFC
Brand dark:    #0D0D12
```

---

## Related app files

| File | Purpose |
|------|---------|
| `api/contact.js` | Existing Resend integration (contact form) |
| `src/App.jsx` → `AuthScreen` | Sign-up + forgot password UI |
| `src/App.jsx` → `ResetPasswordScreen` | `/reset-password` handler |
| `.env.example` | `RESEND_API_KEY`, `CONTACT_FROM_EMAIL` |

No code changes are required to switch Supabase auth email delivery to Resend — this is entirely **Supabase Dashboard + Resend Dashboard** configuration.
