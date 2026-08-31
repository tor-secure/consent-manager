const SITE_KEY = "site_327f98c3148c1c208c12fe2e2c7b1d5f4300a633f37be78d";
const BASE = "http://localhost:3000";

async function test() {
  console.log("=== Test 1: Config endpoint ===");
  const r1 = await fetch(BASE + "/api/sdk/" + SITE_KEY + "/config", {
    headers: { Origin: "http://example.com" },
  });
  console.log("Status:", r1.status);
  console.log("ACAO header:", r1.headers.get("Access-Control-Allow-Origin"));
  const d1 = await r1.json();
  console.log("Success:", d1.success);
  if (d1.success) {
    console.log("Website ID:", d1.websiteId);
    console.log(
      "Policy:",
      d1.policy?.name,
      "v" + d1.policy?.version,
      "published=" + d1.policy?.isPublished,
    );
    console.log(
      "Purposes:",
      d1.purposes?.length,
    );
    d1.purposes?.forEach((p: any) => {
      console.log("   - " + p.key + ": " + p.name + " required=" + p.isRequired);
    });
    console.log("Vendors:", d1.vendors?.length);
    d1.vendors?.forEach((v: any) => {
      console.log("   - " + v.name + " (" + v.domain + ")");
    });
    console.log("Trackers:", d1.trackerRules?.length);
    console.log("Banner title:", d1.bannerConfig?.title);
    console.log("Banner position:", d1.bannerConfig?.position);
    console.log(
      "Show buttons: accept=" + d1.bannerConfig?.showAcceptAll +
        " reject=" + d1.bannerConfig?.showRejectAll +
        " customize=" + d1.bannerConfig?.showCustomize,
    );
  } else {
    console.log("Error:", d1.message);
    return;
  }
  console.log("");

  console.log("=== Test 2: SDK script endpoint ===");
  const r2 = await fetch(BASE + "/api/sdk/script?siteKey=" + encodeURIComponent(SITE_KEY), {
    headers: { Origin: "http://example.com" },
  });
  console.log("Status:", r2.status);
  console.log("Content-Type:", r2.headers.get("Content-Type"));
  console.log("ACAO header:", r2.headers.get("Access-Control-Allow-Origin"));
  const body2 = await r2.text();
  console.log("Script length:", body2.length, "bytes");
  console.log("Contains __CMP_SITE_KEY:", body2.includes("__CMP_SITE_KEY"));
  console.log("Contains submitConsent:", body2.includes("submitConsent"));
  console.log("Contains renderBanner:", body2.includes("renderBanner"));
  console.log("Contains window.CMP:", body2.includes("window.CMP"));
  console.log("");

  console.log("=== Test 3: Invalid siteKey (expect 404) ===");
  const r3 = await fetch(BASE + "/api/sdk/invalid_key_123/config");
  const d3 = await r3.json();
  console.log("Status:", r3.status, "Success:", d3.success, "Message:", d3.message);
  console.log("");

  console.log("=== Test 4: OPTIONS preflight (config) ===");
  const r4 = await fetch(BASE + "/api/sdk/" + SITE_KEY + "/config", {
    method: "OPTIONS",
    headers: { Origin: "http://example.com", "Access-Control-Request-Method": "GET" },
  });
  console.log("Status:", r4.status);
  console.log("ACAO header:", r4.headers.get("Access-Control-Allow-Origin"));
  console.log("Methods:", r4.headers.get("Access-Control-Allow-Methods"));
  console.log("");

  const websiteId = d1.websiteId;

  console.log("=== Test 5: POST consent record (accept-all) ===");
  const r5 = await fetch(BASE + "/api/consent/record", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://example.com" },
    body: JSON.stringify({
      websiteId,
      submission: { choice: "accept-all", purposeDecisions: [], vendorDecisions: [] },
    }),
  });
  console.log("Status:", r5.status);
  console.log("ACAO header:", r5.headers.get("Access-Control-Allow-Origin"));
  const d5 = await r5.json();
  console.log("Success:", d5.success);
  if (d5.success) {
    console.log("consentId:", d5.consentId);
    console.log("status:", d5.status);
  } else {
    console.log("Error:", d5.message);
    return;
  }
  console.log("");

  console.log("=== Test 6: GET consent record back ===");
  const cid1 = d5.consentId;
  const r6 = await fetch(
    BASE + "/api/consent/record?consentId=" + encodeURIComponent(cid1) +
      "&websiteId=" + encodeURIComponent(websiteId),
  );
  const d6 = await r6.json();
  console.log("Status:", r6.status, "Success:", d6.success);
  if (d6.success) {
    console.log("Record status:", d6.record.status);
    console.log("Decisions count:", d6.decisions.length);
    const allGranted = d6.decisions.every((d: any) => d.granted);
    console.log("All granted (accept-all):", allGranted);
    const purposesWithGrant = d6.decisions.filter((d: any) => d.purposeId && d.granted).length;
    const vendorsWithGrant = d6.decisions.filter((d: any) => d.vendorId && d.granted).length;
    console.log("Purposes granted:", purposesWithGrant, "/", d1.purposes.length);
    console.log("Vendors granted:", vendorsWithGrant, "/", d1.vendors.length);
  }
  console.log("");

  console.log("=== Test 7: POST withdraw consent ===");
  const r7 = await fetch(BASE + "/api/consent/withdraw", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://example.com" },
    body: JSON.stringify({ consentId: cid1, websiteId }),
  });
  const d7 = await r7.json();
  console.log("Status:", r7.status, "Success:", d7.success);
  if (d7.success) console.log("Withdrawn at:", d7.withdrawnAt);
  console.log("ACAO header:", r7.headers.get("Access-Control-Allow-Origin"));
  console.log("");

  console.log("=== Test 8: Duplicate withdraw (expect 409) ===");
  const r8 = await fetch(BASE + "/api/consent/withdraw", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ consentId: cid1, websiteId }),
  });
  console.log("Status:", r8.status, "(expected 409)");
  const d8 = await r8.json();
  console.log("Success:", d8.success, "Message:", d8.message);
  console.log("");

  console.log("=== Test 9: POST reject-all ===");
  const r9 = await fetch(BASE + "/api/consent/record", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      websiteId,
      submission: { choice: "reject-all", purposeDecisions: [], vendorDecisions: [] },
    }),
  });
  const d9 = await r9.json();
  console.log("Status:", r9.status, "Success:", d9.success, "consentId:", d9.consentId);
  if (d9.success) {
    const cid2 = d9.consentId;
    const r9b = await fetch(
      BASE + "/api/consent/record?consentId=" + encodeURIComponent(cid2) +
        "&websiteId=" + encodeURIComponent(websiteId),
    );
    const d9b = await r9b.json();
    const nGranted = d9b.decisions.filter((d: any) => d.granted).length;
    console.log(
      "Reject-all decisions:",
      nGranted,
      "granted /",
      d9b.decisions.length,
      "total",
    );
    const requiredPurposeIds = new Set(
      d1.purposes.filter((p: any) => p.isRequired).map((p: any) => p.id),
    );
    let ok = true;
    for (const d of d9b.decisions) {
      if (d.purposeId && requiredPurposeIds.has(d.purposeId)) {
        if (d.granted !== true) { ok = false; console.log("FAIL: required purpose not granted"); }
      } else if (d.purposeId && !requiredPurposeIds.has(d.purposeId)) {
        if (d.granted !== false) { ok = false; console.log("FAIL: non-required purpose granted"); }
      } else if (d.vendorId) {
        if (d.granted !== false) { ok = false; console.log("FAIL: vendor granted after reject-all"); }
      }
    }
    console.log("Only required purposes granted (reject-all):", ok ? "PASS" : "FAIL");
    console.log("Record status:", d9b.record.status, "(expected: 'rejected' or 'partial' if required purposes exist)");
  }
  console.log("");

  console.log("=== Test 10: OPTIONS preflight consent record ===");
  const r10 = await fetch(BASE + "/api/consent/record", {
    method: "OPTIONS",
    headers: { Origin: "http://example.com", "Access-Control-Request-Method": "POST" },
  });
  console.log("Status:", r10.status);
  console.log("Methods:", r10.headers.get("Access-Control-Allow-Methods"));
  console.log("ACAO:", r10.headers.get("Access-Control-Allow-Origin"));
  console.log("");

  console.log("=== Test 11: OPTIONS preflight withdraw ===");
  const r11 = await fetch(BASE + "/api/consent/withdraw", {
    method: "OPTIONS",
    headers: { Origin: "http://example.com", "Access-Control-Request-Method": "POST" },
  });
  console.log("Status:", r11.status);
  console.log("Methods:", r11.headers.get("Access-Control-Allow-Methods"));
  console.log("");

  console.log("=== Test 12: Granular submission (partial) ===");
  const firstPurposeId = d1.purposes.find((p: any) => !p.isRequired)?.id;
  const firstVendorId = d1.vendors[0]?.id;
  const granularPurposes = d1.purposes.map((p: any) => ({
    purposeId: p.id,
    granted: p.isRequired ? true : (p.id === firstPurposeId ? true : false),
  }));
  const granularVendors = d1.vendors.map((v: any) => ({
    vendorId: v.id,
    granted: v.id === firstVendorId ? true : false,
  }));
  const r12 = await fetch(BASE + "/api/consent/record", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      websiteId,
      submission: {
        choice: "granular",
        purposeDecisions: granularPurposes,
        vendorDecisions: granularVendors,
      },
    }),
  });
  const d12 = await r12.json();
  console.log("Status:", r12.status, "Success:", d12.success, "consentId:", d12.consentId);
  if (d12.success) {
    const cid3 = d12.consentId;
    const r12b = await fetch(
      BASE + "/api/consent/record?consentId=" + encodeURIComponent(cid3) +
        "&websiteId=" + encodeURIComponent(websiteId),
    );
    const d12b = await r12b.json();
    console.log("Overall record status:", d12b.record.status, "(expected: partial)");
    if (firstPurposeId) {
      const firstPurposeDecision = d12b.decisions.find((d: any) => d.purposeId === firstPurposeId);
      console.log("First non-required purpose granted:", firstPurposeDecision?.granted, "(expected true)");
    }
    if (firstVendorId) {
      const firstVendorDecision = d12b.decisions.find((d: any) => d.vendorId === firstVendorId);
      console.log("First vendor granted:", firstVendorDecision?.granted, "(expected true)");
    }
  }
  console.log("");

  console.log("=== Test 13: Existing consent ID update ===");
  if (d12.success) {
    const existingId = d12.consentId;
    const r13 = await fetch(BASE + "/api/consent/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        websiteId,
        consentId: existingId,
        submission: { choice: "accept-all", purposeDecisions: [], vendorDecisions: [] },
      }),
    });
    const d13 = await r13.json();
    console.log("Status:", r13.status, "Success:", d13.success);
    console.log("Same consentId returned:", d13.consentId === existingId);
    if (d13.success) {
      const r13b = await fetch(
        BASE + "/api/consent/record?consentId=" + encodeURIComponent(existingId) +
          "&websiteId=" + encodeURIComponent(websiteId),
      );
      const d13b = await r13b.json();
      const nowAllGranted = d13b.decisions.every((d: any) => d.granted);
      console.log("Updated record: all granted now?", nowAllGranted ? "PASS" : "FAIL");
    }
  }
  console.log("");

  console.log("=== ALL TESTS COMPLETED ===");
}

test().catch((e) => {
  console.error(e);
  process.exit(1);
});
