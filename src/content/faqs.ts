export const FAQ_DISCLAIMER =
  "The information provided in these FAQs is for general informational purposes only and does not constitute legal, regulatory, compliance, cybersecurity, or professional advice. ConsentGuru does not warrant that the information is complete, accurate, current, or applicable to every organisation or circumstance. Use of ConsentGuru does not, by itself, guarantee compliance with any applicable law or regulation. Organisations remain responsible for assessing their own legal obligations, configuring the platform appropriately, and obtaining independent professional advice where required.";

export type FaqItem = { question: string; answer: string };

export const FAQS: FaqItem[] = [
  {
    question: "What is ConsentGuru?",
    answer:
      "ConsentGuru is an all-in-one consent management platform designed to help organisations collect, manage, enforce, analyse, and maintain evidence of user consent across websites, mobile applications, and digital platforms.",
  },
  {
    question: "What privacy regulations does ConsentGuru support?",
    answer:
      "ConsentGuru is designed to support consent and privacy workflows relating to regulations including the Digital Personal Data Protection (DPDP) framework, GDPR, CCPA, LGPD, PIPEDA, and other applicable privacy requirements.",
  },
  {
    question: "Does using ConsentGuru make my organisation legally compliant?",
    answer:
      "No. ConsentGuru provides technology and workflows that can assist organisations in meeting their privacy and consent obligations. Compliance ultimately depends on how the platform is configured and used, as well as the organisation's policies, processing activities, contracts, notices, and applicable legal requirements.",
  },
  {
    question: "What is a Consent Management Platform (CMP)?",
    answer:
      "A Consent Management Platform helps organisations obtain, record, manage, communicate, and enforce users' choices regarding the processing of personal data, cookies, trackers, and other technologies.",
  },
  {
    question: "What types of consent can ConsentGuru manage?",
    answer:
      "ConsentGuru supports granular consent management for cookies, categories, purposes, vendors, and other processing activities. It also provides workflows for withdrawal, consent evidence, and purpose-level controls.",
  },
  {
    question: "Can ConsentGuru manage cookie consent?",
    answer:
      "Yes. ConsentGuru provides consent banners, preference management, cookie/SDK/tracker scanning, script and SDK blocking, and cookie-related consent controls.",
  },
  {
    question: "Can I customise the consent banner?",
    answer:
      "Yes. ConsentGuru provides a Customizable Consent Banner and Banner Studio to create consent experiences aligned with an organisation's branding and requirements.",
  },
  {
    question: "Can users change or withdraw their consent?",
    answer:
      "Yes. ConsentGuru is designed to support user preference management and consent withdrawal. Withdrawal and preference changes can be recorded as part of the consent evidence and enforcement workflow.",
  },
  {
    question: "Does ConsentGuru maintain proof of consent?",
    answer:
      "Yes. ConsentGuru provides consent receipts and cryptographic proof, together with consent IDs, policy snapshots, and exportable evidence for relevant workflows.",
  },
  {
    question: "What is a consent receipt?",
    answer:
      "A consent receipt is a record of a user's consent decision and the relevant circumstances surrounding that decision. It can provide evidence of what consent was given, for which purposes, and under which applicable policy or configuration.",
  },
  {
    question: "Can ConsentGuru block scripts and trackers until consent is obtained?",
    answer:
      "Yes. ConsentGuru provides Script & SDK Blocking and consent enforcement capabilities designed to prevent applicable technologies from operating until the required consent or permission is available.",
  },
  {
    question: "What is the Consent Firewall?",
    answer:
      "The Consent Firewall is a ConsentGuru capability designed to enforce consent decisions before applicable data processing or technology execution takes place.",
  },
  {
    question: "Does ConsentGuru support Google Consent Mode?",
    answer: "Yes. Google Consent Mode is included among the supported capabilities listed by ConsentGuru.",
  },
  {
    question: "Does ConsentGuru support IAB TCF and GPP?",
    answer: "Yes. ConsentGuru's listed capabilities include IAB TCF / GPP support and vendor-related controls.",
  },
  {
    question: "Can ConsentGuru manage consent across multiple domains?",
    answer:
      "Yes. ConsentGuru supports cross-domain and cross-device consent capabilities. The number of domains and other limits may depend on the subscription plan.",
  },
  {
    question: "Can ConsentGuru be integrated into my website?",
    answer:
      "Yes. The platform provides SDKs, plugins, APIs, and a website installation workflow. The stated implementation process involves registering the domain, creating a policy, designing the banner, publishing the configuration, and installing the provided snippet.",
  },
  {
    question: "How long does it take to integrate ConsentGuru?",
    answer:
      "The website describes the implementation as a five-step process and states that organisations can integrate the platform in minutes. Actual implementation time may vary depending on the website, technology stack, configuration, and required integrations.",
  },
  {
    question: "Can ConsentGuru manage privacy policies and consent notices?",
    answer:
      "Yes. ConsentGuru provides policy templates and workflows for creating and versioning privacy-related notices, including DPDP and GDPR templates, and associating them with relevant purposes.",
  },
  {
    question: "Does ConsentGuru support Data Subject Rights or rights requests?",
    answer:
      "Yes. The platform provides workflows for intake and management of access, deletion, and withdrawal requests, together with associated consent evidence and exports.",
  },
  {
    question: "Can ConsentGuru manage children's consent?",
    answer:
      "Yes. ConsentGuru lists Child Protection & Guardian Consent as a core capability and provides age-assurance, guardian consent, and restricted-processing workflows.",
  },
  {
    question: "Can ConsentGuru help prevent children from inheriting adult consent?",
    answer:
      "ConsentGuru provides child-protection workflows designed to support age assurance, guardian consent, and restricted processing so that applicable child accounts do not automatically inherit adult opt-ins.",
  },
  {
    question: "Does ConsentGuru provide consent analytics?",
    answer:
      "Yes. ConsentGuru provides analytics and reporting capabilities covering consent rates, user preferences, consent trends, segmentation, quality scores, experiments, and other consent-related metrics.",
  },
  {
    question: "What is Consent Quality Score?",
    answer:
      "Consent Quality Score is a ConsentGuru capability intended to provide an assessment of the quality and effectiveness of an organisation's consent environment. The actual interpretation of the score depends on the underlying configuration, data, and methodology used by the platform.",
  },
  {
    question: "What is AI Consent Autopilot?",
    answer:
      "AI Consent Autopilot is a ConsentGuru capability designed to automate aspects of consent management and consent intelligence. Its availability may depend on the subscription plan and applicable product configuration.",
  },
  {
    question: "What is the Consent Digital Twin?",
    answer:
      "Consent Digital Twin is a ConsentGuru capability designed to provide a digital representation of an organisation's consent environment and related relationships, helping teams analyse consent and processing dependencies.",
  },
  {
    question: "What is AI-Agent Permissioning?",
    answer:
      "AI-Agent Permissioning is a ConsentGuru capability intended to manage permissions and consent considerations associated with AI agents and automated systems.",
  },
  {
    question: "Does ConsentGuru support real-time data redaction?",
    answer:
      "Yes. Real-Time Consent-Based Data Redaction is listed as one of ConsentGuru's capabilities. It is designed to support redaction or restriction of applicable data when a user's consent or permission changes.",
  },
  {
    question: "Who can use ConsentGuru?",
    answer:
      "ConsentGuru is designed for organisations of different sizes and industries, including e-commerce, SaaS, media and publishing, healthcare, finance, education, travel and hospitality, telecom, public sector, marketplaces, gaming, and agencies.",
  },
  {
    question: "What subscription plans does ConsentGuru offer?",
    answer:
      "The website currently lists three plans: Silver, Gold, and Platinum. The plans differ in the number of available features, domains, pageviews, support levels, and enterprise capabilities. Pricing and plan limits may change, so users should refer to the current pricing information before subscribing.",
  },
  {
    question: "Is ConsentGuru a substitute for legal advice?",
    answer:
      "No. ConsentGuru is a technology platform and does not replace legal, regulatory, privacy, cybersecurity, or other professional advice. Organisations remain responsible for determining their legal obligations, configuring their consent mechanisms appropriately, maintaining required records, and ensuring that their processing activities comply with applicable law.",
  },
];
