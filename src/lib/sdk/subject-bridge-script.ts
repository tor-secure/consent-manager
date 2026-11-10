/**
 * Optional signed-in bridge for customer sites.
 *
 * Customers keep the API key on their server. This script only calls a
 * same-origin bridge URL they host, then hands the short-lived token to CMP.
 */

export function buildSubjectBridgeScript(): string {
  return `(function(){
  if (window.__CMP_SUBJECT_BRIDGE__) return;
  window.__CMP_SUBJECT_BRIDGE__ = true;

  function currentScript() {
    var s = document.currentScript;
    if (s && s.getAttribute) return s;
    var list = document.getElementsByTagName('script');
    for (var i = list.length - 1; i >= 0; i--) {
      if (list[i].getAttribute && list[i].getAttribute('data-cmp-subject-bridge') != null) {
        return list[i];
      }
    }
    return null;
  }

  var script = currentScript();
  var bridgeUrl = (script && script.getAttribute('data-bridge-url')) ||
    (window.__CMP_SUBJECT_BRIDGE_URL || '');
  var websiteId = (script && script.getAttribute('data-website-id')) ||
    (window.__CMP_WEBSITE_ID || '');
  bridgeUrl = String(bridgeUrl || '').trim();
  websiteId = String(websiteId || '').trim();
  if (!bridgeUrl) {
    try { console.warn('[CMP] subject bridge skipped: data-bridge-url is required'); } catch (e) {}
    return;
  }

  var active = false;
  var busy = false;
  var lastToken = '';

  function cmp() {
    return window.CMP || null;
  }

  function clearLocal() {
    active = false;
    lastToken = '';
    var api = cmp();
    if (api && typeof api.clearSubjectSession === 'function') {
      try { api.clearSubjectSession(); } catch (eClear) {}
    }
  }

  function applySession(data) {
    var token = data && typeof data.subjectSessionToken === 'string'
      ? data.subjectSessionToken.trim()
      : '';
    if (!token) return;
    var api = cmp();
    if (!api || typeof api.setSubjectSession !== 'function') return;
    if (token === lastToken && active) return;
    lastToken = token;
    active = true;
    var payload = {
      token: token,
      expiresAt: data.expiresAt || undefined,
      subjectKey: data.subjectKey || undefined,
      websiteId: data.websiteId || websiteId || undefined
    };
    try {
      var result = api.setSubjectSession(payload);
      if (result && typeof result.then === 'function') {
        result.catch(function() {});
      }
    } catch (eSet) {}
  }

  function sync() {
    if (busy) return;
    busy = true;
    var url = bridgeUrl;
    if (websiteId && url.indexOf('websiteId=') === -1) {
      url += (url.indexOf('?') >= 0 ? '&' : '?') + 'websiteId=' + encodeURIComponent(websiteId);
    }
    fetch(url, {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    })
      .then(function(r) {
        if (r.status === 401 || r.status === 403 || r.status === 204) {
          if (active) clearLocal();
          return null;
        }
        if (!r.ok) return null;
        return r.json().catch(function() { return null; });
      })
      .then(function(data) {
        if (!data) return;
        if (data.signedIn === false || data.success === false) {
          if (active) clearLocal();
          return;
        }
        if (data.subjectSessionToken) applySession(data);
      })
      .catch(function() {})
      .then(function() { busy = false; });
  }

  function logout() {
    var api = cmp();
    if (api && typeof api.clearSubjectSession === 'function') {
      try { api.clearSubjectSession(); } catch (e1) {}
    }
    active = false;
    lastToken = '';
    fetch(bridgeUrl, {
      method: 'DELETE',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    }).catch(function() {});
  }

  function waitForCmp(attempt) {
    if (cmp() && typeof cmp().setSubjectSession === 'function') {
      sync();
      return;
    }
    if ((attempt || 0) >= 40) return;
    setTimeout(function() { waitForCmp((attempt || 0) + 1); }, 250);
  }

  window.CMPSubjectBridge = {
    sync: sync,
    logout: logout
  };

  window.addEventListener('cmp:subject-logout', function() { logout(); });
  window.addEventListener('focus', function() { sync(); });
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') sync();
  });

  waitForCmp(0);
})();`;
}

export function buildSubjectBridgeSnippet(options: {
  bridgeScriptUrl: string;
  bridgeUrl: string;
  websiteId: string;
}): string {
  const scriptUrl = JSON.stringify(options.bridgeScriptUrl);
  const bridgeUrl = JSON.stringify(options.bridgeUrl);
  const websiteId = JSON.stringify(options.websiteId);
  return `<!-- Optional: signed-in consent sync. Keep the API key on your server only. -->
<script
  src=${scriptUrl}
  data-cmp-subject-bridge
  data-bridge-url=${bridgeUrl}
  data-website-id=${websiteId}
  defer
></script>`;
}

export function buildClerkSubjectBridgeRouteExample(options: {
  consentGuruOrigin: string;
  websiteId: string;
}): string {
  return `// app/api/cmp/subject/route.ts  (Next.js + Clerk example)
// Env on YOUR site:
//   CONSENT_GURU_API_KEY=...          (from Consent Guru → Developers)
//   CONSENT_GURU_WEBSITE_ID=${options.websiteId}
//   CONSENT_GURU_ORIGIN=${options.consentGuruOrigin}

import { auth, currentUser } from "@clerk/nextjs/server";

const ORIGIN = process.env.CONSENT_GURU_ORIGIN || ${JSON.stringify(options.consentGuruOrigin)};
const WEBSITE_ID = process.env.CONSENT_GURU_WEBSITE_ID || ${JSON.stringify(options.websiteId)};
const API_KEY = process.env.CONSENT_GURU_API_KEY || "";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ signedIn: false }, { status: 401 });
  }
  if (!API_KEY) {
    return Response.json({ success: false, message: "CONSENT_GURU_API_KEY missing" }, { status: 500 });
  }

  const user = await currentUser();
  const primary = user?.emailAddresses?.find((row) => row.id === user.primaryEmailAddressId);
  const email =
    primary && primary.verification?.status === "verified"
      ? primary.emailAddress
      : undefined;

  const res = await fetch(ORIGIN + "/api/v1/consent/subject", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      websiteId: WEBSITE_ID,
      subjectKey: userId,
      email,
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.subjectSessionToken) {
    return Response.json(
      { success: false, message: data?.message || "Failed to mint subject session" },
      { status: res.status || 502 },
    );
  }
  return Response.json({
    success: true,
    subjectSessionToken: data.subjectSessionToken,
    expiresAt: data.expiresAt,
    subjectKey: data.subjectKey || userId,
    websiteId: WEBSITE_ID,
  });
}

export async function DELETE() {
  const { userId } = await auth();
  if (!API_KEY) return Response.json({ success: true });
  await fetch(ORIGIN + "/api/v1/consent/subject/logout", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      websiteId: WEBSITE_ID,
      subjectKey: userId || undefined,
    }),
  }).catch(() => null);
  return Response.json({ success: true });
}

// On Clerk sign-out in the browser, also call:
//   window.CMPSubjectBridge?.logout()
// or dispatch: window.dispatchEvent(new Event('cmp:subject-logout'))
`;
}
