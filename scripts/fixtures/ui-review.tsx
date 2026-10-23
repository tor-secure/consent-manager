import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { DashboardShell } from "../../src/components/dashboard/dashboard-shell";
import { MotionProvider } from "../../src/components/ui/motion-provider";
import { PageHeader } from "../../src/components/ui/page-header";
import { PrivacyGraphExplorer } from "../../src/components/intelligence/privacy-graph-explorer";
import { EvidenceTimeline } from "../../src/components/consent/evidence-timeline";
import { TwinExplorer } from "../../src/components/intelligence/twin-explorer";
import { CrawlProgress } from "../../src/components/scanner/crawl-progress";
import Home from "../../src/app/page";
import { SectionHub } from "../../src/components/dashboard/section-hub";
import { dashboardNavigationGroups } from "../../src/config/navigation";
import { DpdpGuideContent } from "../../src/components/public/dpdp-guide-content";
import PricingPage from "../../src/app/pricing/page";
import AboutPage from "../../src/app/about/page";
import BlogsPage from "../../src/app/blogs/page";
import { SeoLandingView } from "../../src/components/public/seo-landing-view";
import { SEO_LANDINGS } from "../../src/content/seo-landings";
import { PrivacyCentreLayout, LegalDocument } from "../../src/components/public/privacy-centre-shell";
import { PRIVACY_POLICY_SECTIONS } from "../../src/content/privacy-centre";
import { HomeNavbar } from "../../src/components/public/home-navbar";
import { HomeFooter } from "../../src/components/public/home-footer";
import { PageExperience } from "../../src/components/ui/page-experience";
import { WorkspaceTabs } from "../../src/components/ui/workspace-tabs";
import { WorkflowDisclosure } from "../../src/components/ui/workflow-disclosure";
import { FormSection } from "../../src/components/ui/form-section";
import { AuthPageShell } from "../../src/components/auth/auth-page-shell";
import { ModuleReading } from "../../src/components/e-learning/module-reading";
import { ArticleReading } from "../../src/components/public/article-reading";
import { getAllBlogs } from "../../src/content/blogs";
import { ToolsHome } from "../../src/components/tools/tools-home";

const websiteId = "22222222-2222-4222-8222-222222222222";
const purposeId = "11111111-1111-4111-8111-111111111111";
const nodes = [
  { id: "website:1", type: "website", label: "Example website", provenance: "configured" },
  { id: "page:1", type: "page", label: "/pricing", provenance: "observed" },
  { id: `purpose:${purposeId}`, type: "purpose", label: "Analytics", provenance: "configured" },
  { id: "policy:1", type: "policy", label: "Website privacy policy", provenance: "configured" },
  { id: "tracker:1", type: "tracker", label: "Analytics tracker", provenance: "configured" },
  { id: "vendor:1", type: "vendor", label: "Example processor", provenance: "inferred" },
  { id: "destination:1", type: "destination", label: "metrics.example.com", provenance: "observed" },
  { id: "observation:1", type: "observation", label: "Fetch request", provenance: "observed", data: { page: "https://example.com/pricing", method: "GET" } },
];
const edges = [
  { id: "1", source: "page:1", target: "website:1", relation: "belongs_to_site", provenance: "observed" },
  { id: "2", source: "tracker:1", target: `purpose:${purposeId}`, relation: "uses_purpose", provenance: "configured" },
  { id: "3", source: "tracker:1", target: "vendor:1", relation: "belongs_to_vendor", provenance: "inferred" },
  { id: "4", source: "observation:1", target: "destination:1", relation: "contacts", provenance: "observed", evidenceIds: ["observation:1"] },
  { id: "5", source: "observation:1", target: "page:1", relation: "occurs_on", provenance: "observed" },
];
const snapshot = { website: { id: websiteId, name: "Example website", domain: "example.com" }, purposes: [{ id: purposeId, name: "Analytics", key: "analytics", isRequired: false, dataCategories: [], legalBasis: null }], vendors: [{ id: "vendor-a", name: "Example processor", domain: "metrics.example.com", country: "IN", purposeIds: [purposeId] }], trackers: [{ id: "tracker-a", name: "Analytics tracker", domain: "metrics.example.com", type: "script", identifier: null, purposeId, vendorId: "vendor-a", isEssential: false, status: "active" }] };

function Review() {
  const view = new URLSearchParams(location.search).get("view") ?? "graph";
  const [dark, setDark] = useState(false);
  if (view === "public") return <Home />;
  if (view === "dpdp") return <MotionProvider><PageExperience /><div className="public-page"><HomeNavbar /><main id="main-content"><DpdpGuideContent /></main><HomeFooter /></div></MotionProvider>;
  if (view === "pricing") return <MotionProvider><PageExperience /><PricingPage /></MotionProvider>;
  if (view === "about") return <MotionProvider><PageExperience /><AboutPage /></MotionProvider>;
  if (view === "blogs") return <MotionProvider><PageExperience /><BlogsPage /></MotionProvider>;
  if (view === "solution") return <MotionProvider><PageExperience /><SeoLandingView page={SEO_LANDINGS[0]} /></MotionProvider>;
  if (view === "legal") return <MotionProvider><PageExperience /><PrivacyCentreLayout title="Privacy Policy" kicker="Privacy centre"><LegalDocument current="privacy-policy" sections={PRIVACY_POLICY_SECTIONS} /></PrivacyCentreLayout></MotionProvider>;
  if (view === "auth") return <MotionProvider><AuthPageShell mode="sign-in"><form className="space-y-4"><h1>Sign in preview</h1><p>This is a layout fixture. Authentication is not connected.</p><label>Email<input type="email" className="field-input" /></label><button type="button" className="btn btn-primary">Continue</button></form></AuthPageShell></MotionProvider>;
  if (view === "article") { const post = getAllBlogs()[0]; return <MotionProvider><PrivacyCentreLayout title={post.title} kicker="Article"><div className="mx-auto max-w-[1100px] px-5"><ArticleReading sections={post.sections} /></div></PrivacyCentreLayout></MotionProvider>; }
  if (view === "tools") return <MotionProvider><div className="public-page"><HomeNavbar /><main id="main-content"><ToolsHome /></main><HomeFooter /></div></MotionProvider>;
  if (view === "learning") return <MotionProvider><PrivacyCentreLayout title="Learn at your pace" kicker="Learning"><div className="mx-auto max-w-[900px] p-8"><ModuleReading paragraphs={getAllBlogs()[0].sections[0].paragraphs} /></div></PrivacyCentreLayout></MotionProvider>;
  return <MotionProvider><DashboardShell headerLeft={<span className="text-sm font-semibold">Example workspace</span>} headerCenter={<input className="field-input max-w-sm" placeholder="Search workspace" aria-label="Search workspace" />} headerRight={<button className="btn btn-secondary btn-sm" onClick={() => { document.documentElement.classList.toggle("dark"); setDark(!dark); }}>{dark ? "Light theme" : "Dark theme"}</button>}>
    {view === "hub" ? <SectionHub title="Workspace tools" description="Find the tools for your privacy operations." features={dashboardNavigationGroups.flatMap((group) => group.items).slice(0, 10)} /> : <div className="page-wrap space-y-6"><PageHeader title={view === "graph" ? "Privacy Graph" : view === "runtime" ? "Runtime discovery" : view === "twin" ? "Consent digital twin" : view === "workflow" ? "Transfers" : "Consent evidence"} description="UI review with synthetic fixtures. No live tenant or database connection." />
    {view === "graph" && <PrivacyGraphExplorer websiteId={websiteId} nodes={nodes} edges={edges} />}
    {view === "workflow" && <WorkspaceTabs label="Transfer workflows" tabs={[{title:"Transfers",content:<WorkflowDisclosure title="Create a transfer" description="Record the recipient and processing context."><FormSection title="Transfer details" description="Describe the transfer before issuing a separate authorization."><label className="field-label">Recipient<input className="field-input" /></label><button className="btn btn-primary">Save transfer</button></FormSection></WorkflowDisclosure>},{title:"Processing activities",content:<p>Processing activity records appear here.</p>},{title:"Secure transfer",content:<p>Authorization is required before an envelope can be issued.</p>}]} />}
    {view === "twin" && <TwinExplorer snapshot={snapshot} />}
    {view === "evidence" && <><div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6"><EvidenceTimeline items={[{ id: "1", title: "Session issued", description: "Visitor consent session created for the example site.", timestamp: "2026-10-02T10:00:00Z", provenance: "observed" }, { id: "2", title: "Policy context", description: "Website privacy policy v3", provenance: "configured" }, { id: "3", title: "Consent decision", description: "Analytics not granted; required processing unchanged.", timestamp: "2026-10-02T10:00:04Z", provenance: "observed" }, { id: "4", title: "Proof verified", description: "The recorded decision matches its signed evidence.", provenance: "observed" }]} /></div><CrawlProgress scanId="fixture-scan" status="completed" progress={100} pagesScanned={12} errorMessage={null} /></>}
    </div>}
  </DashboardShell></MotionProvider>;
}
createRoot(document.getElementById("root")!).render(<Review />);
