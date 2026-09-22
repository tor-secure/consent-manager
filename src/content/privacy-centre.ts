export const PRIVACY_CENTRE_UPDATED = "21 September 2026";
export const PRIVACY_CENTRE_EFFECTIVE = "21 September 2026";

export const PRIVACY_CENTRE_ORG = {
  name: "ConsentGuru",
  addressLines: [
    "#10, Second Floor, Manasa Towers",
    "MG Road, Mangalore - 575003",
    "Karnataka, India",
  ],
  supportEmail: "support@consentguru.com",
  dpoName: "Shijas Ahmed",
  dpoEmail: "shijas@consentguru.com",
  website: "www.consentguru.com",
} as const;

export type LegalBlock =
  | { type: "p"; text: string }
  | { type: "lead"; text: string }
  | { type: "bullets"; items: { title?: string; text: string }[] }
  | { type: "dl"; items: { term: string; definition: string }[] };

export type LegalSection = {
  id: string;
  number?: string;
  title: string;
  blocks: LegalBlock[];
};

export const PRIVACY_CENTRE_INTRO: LegalBlock[] = [
  {
    type: "p",
    text: "At ConsentGuru, we believe privacy should be simple, transparent and within your control. The Privacy Centre brings together everything you need to understand how ConsentGuru handles personal data, cookies, consent and privacy preferences. Here you can learn about the information we collect and why we use it, understand how cookies and similar technologies work, exercise your privacy rights, manage your preferences, and find our Data Protection Officer.",
  },
  {
    type: "p",
    text: "If you use ConsentGuru through another organisation's website or service, that organisation may be responsible for deciding how your personal data is collected and used. We encourage you to review the relevant privacy notice provided by that organisation as well.",
  },
];

export const PRIVACY_POLICY_SECTIONS: LegalSection[] = [
  {
    id: "introduction",
    number: "1",
    title: "Introduction",
    blocks: [
      {
        type: "p",
        text: "Welcome to ConsentGuru. ConsentGuru is a consent management and privacy technology platform designed to help organisations obtain, record, manage and respect the privacy choices and consent preferences of individuals. We believe privacy should be understandable, transparent and practical. This Privacy Policy explains what information ConsentGuru may collect, how we use it, when we share it, how we protect it and the choices available to individuals. This Privacy Policy applies to the ConsentGuru website, platform, applications, APIs and related services operated through www.consentguru.com.",
      },
    ],
  },
  {
    id: "who-we-are",
    number: "2",
    title: "Who We Are",
    blocks: [
      {
        type: "p",
        text: "ConsentGuru, #10, Second Floor, Manasa Towers, MG Road, Mangalore - 575003, Karnataka, India.",
      },
      {
        type: "p",
        text: "For privacy-related questions: support@consentguru.com. Data Protection Officer: Shijas Ahmed, shijas@consentguru.com.",
      },
      {
        type: "p",
        text: "Depending on the nature of the processing, ConsentGuru may act as a Data Fiduciary, Data Controller, Data Processor, service provider or equivalent entity under applicable data protection law.",
      },
    ],
  },
  {
    id: "our-role",
    number: "3",
    title: "Our Role in Personal Data Processing",
    blocks: [
      {
        type: "p",
        text: "ConsentGuru is primarily a consent management platform. When an organisation uses ConsentGuru to obtain or manage consent from its customers, website visitors, employees, patients, students, users or other individuals, that organisation generally determines what personal data is collected, why it is collected, the purpose or legal basis for processing, how long information is retained and how it is otherwise used.",
      },
      {
        type: "p",
        text: "In these circumstances, the organisation will generally act as the Data Fiduciary, Data Controller or equivalent entity, while ConsentGuru acts as a Data Processor, service provider or equivalent entity. If you interact with ConsentGuru through another organisation's website or service, that organisation's privacy policy should be your primary source of information regarding why your personal data is collected and used.",
      },
    ],
  },
  {
    id: "information-we-collect",
    number: "4",
    title: "Information We May Collect",
    blocks: [
      {
        type: "bullets",
        items: [
          {
            title: "Information you provide",
            text: "name, email address, telephone or mobile number, organisation name, job title, login credentials, billing and transaction information, enquiry information, demonstration/onboarding information and support communications.",
          },
          {
            title: "Account and subscription information",
            text: "information necessary to create and maintain accounts, authenticate users, provide services, manage subscriptions, process payments and communicate with account administrators.",
          },
          {
            title: "Technical and usage information",
            text: "IP address, browser type and version, operating system, device type, approximate location derived from IP address, date and time of access, referring website, pages/features accessed, logs and security/authentication information.",
          },
          {
            title: "Consent and preference information",
            text: "whether consent was given, refused or withdrawn; date/time; consent category or purpose; notice version; method of obtaining consent; cookie/privacy preferences; withdrawal or modification; and technical information necessary to establish and maintain a consent record.",
          },
        ],
      },
    ],
  },
  {
    id: "how-we-use",
    number: "5",
    title: "How We Use Personal Data",
    blocks: [
      {
        type: "p",
        text: "We may use personal data to provide and operate ConsentGuru; create and manage accounts; authenticate users; record and manage consent and privacy preferences; maintain consent records and audit trails; provide customer support; communicate with customers and users; process subscriptions and payments; monitor service performance; detect and prevent fraud and abuse; maintain security; diagnose technical problems; improve products and services; comply with applicable laws; establish, exercise or defend legal claims; and perform other purposes disclosed at the time of collection. We do not intentionally use personal data for purposes incompatible with the purpose for which it was collected unless permitted or required by applicable law.",
      },
    ],
  },
  {
    id: "consent-management",
    number: "6",
    title: "Consent Management",
    blocks: [
      {
        type: "p",
        text: "ConsentGuru is designed to help organisations manage consent in a transparent and accountable manner. Depending on configuration, our technology may help organisations present privacy notices and consent requests, provide granular choices, record affirmative consent and refusal, record withdrawal, maintain consent histories and audit trails, manage cookie preferences and demonstrate the status and history of consent. The organisation deploying ConsentGuru remains responsible for determining whether its notices, purposes, processing activities and implementation comply with applicable law.",
      },
    ],
  },
  {
    id: "cookies",
    number: "7",
    title: "Cookies and Similar Technologies",
    blocks: [
      {
        type: "p",
        text: "ConsentGuru and organisations using our technology may use cookies, pixels, local storage, SDKs, tags and similar technologies for essential functionality, authentication, security, privacy preferences, consent management, analytics, performance monitoring, service improvement and other disclosed purposes. Where legally required, non-essential cookies and similar technologies will be used only after appropriate consent or another lawful basis has been established. Further information is provided in the Cookie Policy section of this Privacy Centre.",
      },
    ],
  },
  {
    id: "on-behalf-of-customers",
    number: "8",
    title: "Information Processed on Behalf of Customers",
    blocks: [
      {
        type: "p",
        text: "If you interact with ConsentGuru because it has been deployed by another organisation, that organisation determines the categories of personal data and purposes for which information is processed. A customer may configure ConsentGuru to manage cookie preferences, marketing preferences, communication preferences, privacy notices, data-sharing choices, consent records, subscription preferences and other privacy choices. ConsentGuru processes such information according to the customer's instructions and applicable contractual arrangements.",
      },
    ],
  },
  {
    id: "sharing",
    number: "9",
    title: "Sharing of Personal Data",
    blocks: [
      {
        type: "p",
        text: "We do not sell personal data as a general business practice. We may disclose personal data to cloud hosting and infrastructure providers, security providers, payment processors, customer support providers, communication providers, professional advisers, auditors and legal advisers, government authorities where legally required, service providers supporting our operations, a successor entity in connection with a merger, acquisition or restructuring, and other parties where permitted by law or authorised by you. Appropriate contractual and legal requirements apply to service providers.",
      },
    ],
  },
  {
    id: "international-transfers",
    number: "10",
    title: "International Data Transfers",
    blocks: [
      {
        type: "p",
        text: "ConsentGuru may use infrastructure, service providers or business partners located in countries other than the country in which you reside. Where personal data is transferred internationally, we will take appropriate measures required by applicable data protection laws, which may include contractual safeguards, adequacy mechanisms, approved transfer mechanisms or other legally recognised safeguards.",
      },
    ],
  },
  {
    id: "security",
    number: "11",
    title: "Data Security",
    blocks: [
      {
        type: "p",
        text: "We take reasonable technical and organisational measures to protect personal data against unauthorised access, disclosure, alteration, misuse, loss or destruction. Measures may include encryption in transit, encryption or equivalent protection at rest, access controls, authentication and authorisation, role-based access, logging and monitoring, vulnerability management, backup and recovery, security testing, incident response procedures and employee and contractor security controls. No internet-based service can guarantee absolute security.",
      },
    ],
  },
  {
    id: "retention",
    number: "12",
    title: "Data Retention",
    blocks: [
      {
        type: "p",
        text: "We retain personal data only for as long as reasonably necessary for the purposes for which it was collected, to provide services, meet contractual obligations, comply with legal requirements, resolve disputes and protect our legitimate interests. Where ConsentGuru processes personal data on behalf of a customer, retention will generally be determined by the customer's instructions, contractual terms and applicable law. When personal data is no longer required, it will be deleted, anonymised or securely disposed of, subject to applicable legal requirements.",
      },
    ],
  },
  {
    id: "your-rights",
    number: "13",
    title: "Your Privacy Rights",
    blocks: [
      {
        type: "p",
        text: "Depending on the jurisdiction and applicable law, you may have rights including access to personal data, correction, deletion or erasure, withdrawal of consent, objection to certain processing, restriction of processing, data portability, information regarding processing, applicable opt-out rights and the right to lodge a complaint with a competent authority. Not every right is available in every jurisdiction and legal exceptions may apply. Where ConsentGuru processes information on behalf of another organisation, that organisation may be responsible for responding to your request.",
      },
    ],
  },
  {
    id: "exercising-rights",
    number: "14",
    title: "Exercising Your Rights",
    blocks: [
      {
        type: "p",
        text: "You may submit a Data Principal request through the ConsentGuru Data Principal Rights portal, or contact support@consentguru.com or our Data Protection Officer, Shijas Ahmed, at shijas@consentguru.com. We may request reasonable information necessary to verify your identity and protect against unauthorised requests. We will respond within the period required by applicable law.",
      },
    ],
  },
  {
    id: "children",
    number: "15",
    title: "Children's Privacy",
    blocks: [
      {
        type: "p",
        text: "ConsentGuru is primarily intended for businesses and professional users. Unless expressly stated otherwise, ConsentGuru does not knowingly seek to collect personal data directly from children in circumstances where such collection is prohibited by law. Where our platform is used by a customer in connection with children or minors, the customer is responsible for implementing appropriate age-related safeguards, parental or guardian consent and other applicable requirements.",
      },
    ],
  },
  {
    id: "third-parties",
    number: "16",
    title: "Third-Party Websites and Services",
    blocks: [
      {
        type: "p",
        text: "Our website or platform may contain links to third-party websites, applications or services. ConsentGuru is not responsible for the privacy practices or security of third-party services. We encourage you to review their privacy policies before providing personal information.",
      },
    ],
  },
  {
    id: "communications",
    number: "17",
    title: "Business Communications",
    blocks: [
      {
        type: "p",
        text: "If you create an account, request a demonstration, contact us or become a customer, we may send service-related communications such as account notifications, security alerts, service announcements, billing communications, support communications and important service or policy updates. Where permitted by law, we may also send information about our products, services or events. You may opt out of promotional communications at any time.",
      },
    ],
  },
  {
    id: "legal-disclosures",
    number: "18",
    title: "Legal and Regulatory Disclosures",
    blocks: [
      {
        type: "p",
        text: "We may process or disclose personal data where necessary to comply with applicable law, respond to lawful government requests, protect rights, property or safety, detect or prevent fraud or security incidents, establish or defend legal claims, or enforce our agreements. We will seek to limit such disclosure to what is legally required or reasonably necessary.",
      },
    ],
  },
  {
    id: "changes",
    number: "19",
    title: "Changes to This Privacy Policy",
    blocks: [
      {
        type: "p",
        text: "We may update this Privacy Policy from time to time to reflect changes in our services, technology or applicable law. Where material changes are made, we will provide appropriate notice where required. The latest version will be published on www.consentguru.com.",
      },
    ],
  },
  {
    id: "complaints",
    number: "20",
    title: "Complaints",
    blocks: [
      {
        type: "p",
        text: "If you have a privacy concern or believe that your personal data has been processed inconsistently with this Privacy Policy or applicable law, please contact Shijas Ahmed, Data Protection Officer, at shijas@consentguru.com or support@consentguru.com. Where applicable law provides a right to complain to a data protection authority or other regulatory body, you may exercise that right.",
      },
    ],
  },
  {
    id: "governing-law",
    number: "21",
    title: "Governing Law",
    blocks: [
      {
        type: "p",
        text: "This Privacy Policy shall be interpreted in accordance with applicable law. Nothing in this Policy is intended to restrict any privacy right that cannot lawfully be excluded or restricted under applicable law.",
      },
    ],
  },
  {
    id: "contact",
    number: "22",
    title: "Contact Us",
    blocks: [
      {
        type: "p",
        text: "ConsentGuru, #10, Second Floor, Manasa Towers, MG Road, Mangalore - 575003, Karnataka, India. General Privacy Contact: support@consentguru.com. Data Protection Officer: Shijas Ahmed, shijas@consentguru.com. Website: www.consentguru.com.",
      },
    ],
  },
];

export const COOKIE_POLICY_SECTIONS: LegalSection[] = [
  {
    id: "what-are-cookies",
    number: "23",
    title: "What Are Cookies?",
    blocks: [
      {
        type: "p",
        text: "Cookies are small text files placed on a device when a website is accessed. Cookies may allow a website to recognise a device, remember preferences, maintain a session, improve security and understand how the website is being used. Similar technologies may include local storage, session storage, pixels, web beacons, SDKs, tags, scripts and other technologies that store or access information on a device.",
      },
    ],
  },
  {
    id: "types",
    number: "24",
    title: "Types of Cookies We May Use",
    blocks: [
      {
        type: "bullets",
        items: [
          {
            title: "Strictly Necessary Cookies",
            text: "necessary for authentication, security, login sessions, fraud prevention, consent preferences and core functionality.",
          },
          {
            title: "Preference Cookies",
            text: "may remember language, region, interface and privacy preferences. Where required by law, these will only be activated after appropriate consent.",
          },
          {
            title: "Analytics Cookies",
            text: "may help us understand website usage, navigation, performance and general visitor behaviour and will be used in accordance with applicable law.",
          },
          {
            title: "Marketing and Advertising Technologies",
            text: "where used, may help measure campaigns and understand interactions with advertising or marketing communications. Where applicable law requires consent, they will not be activated before appropriate consent.",
          },
        ],
      },
    ],
  },
  {
    id: "third-party-tech",
    number: "25",
    title: "Third-Party Technologies",
    blocks: [
      {
        type: "p",
        text: "Certain cookies or similar technologies may be provided by third-party service providers supporting analytics, security, customer support, website performance, payments, communications or marketing. The technologies used may change as our services evolve.",
      },
    ],
  },
  {
    id: "consent-technology",
    number: "26",
    title: "ConsentGuru Consent Technology",
    blocks: [
      {
        type: "p",
        text: "ConsentGuru may itself use cookies or similar technologies to remember privacy choices, including whether an individual accepted, rejected, changed or withdrew a particular privacy preference. This enables ConsentGuru to respect the individual's choices.",
      },
    ],
  },
  {
    id: "managing-preferences",
    number: "27",
    title: "Managing Cookie Preferences",
    blocks: [
      {
        type: "p",
        text: "Where consent is required, users may be provided with controls to accept cookies, reject non-essential cookies, select individual categories, change previously selected preferences and withdraw consent. Cookie preferences may be changed through the ConsentGuru preference centre where available.",
      },
    ],
  },
  {
    id: "browser-controls",
    number: "28",
    title: "Browser Controls",
    blocks: [
      {
        type: "p",
        text: "Most modern browsers allow users to block, delete or restrict cookies. Disabling certain cookies may affect website functionality.",
      },
    ],
  },
  {
    id: "cookie-retention",
    number: "29",
    title: "Cookie Retention",
    blocks: [
      {
        type: "p",
        text: "Cookies may be session cookies or persistent cookies. Session cookies generally expire when the browser session ends. Persistent cookies remain for a defined period or until deleted. The retention period depends on the purpose of the particular technology.",
      },
    ],
  },
  {
    id: "inventory",
    number: "30",
    title: "Cookie Inventory",
    blocks: [
      {
        type: "p",
        text: "ConsentGuru may provide a current cookie inventory through its consent-management interface. The inventory may identify cookie name, provider, purpose, category, duration and whether the cookie is first-party or third-party. Because website technologies may change, the live cookie inventory should be treated as the most current technical description.",
      },
    ],
  },
  {
    id: "cookie-changes",
    number: "31",
    title: "Changes to This Cookie Policy",
    blocks: [
      {
        type: "p",
        text: "We may update this Cookie Policy when our technologies, services or legal requirements change. The latest version will be published in this Privacy Centre.",
      },
    ],
  },
];

export const DPA_SECTIONS: LegalSection[] = [
  {
    id: "dpa-introduction",
    number: "32",
    title: "Introduction",
    blocks: [
      {
        type: "p",
        text: 'This Data Processing Agreement ("DPA") forms part of the agreement between ConsentGuru and the organisation subscribing to or using ConsentGuru\'s services ("Customer"). This DPA applies where ConsentGuru processes Personal Data on behalf of the Customer. It establishes the responsibilities and safeguards applicable to such processing. Where applicable, this DPA is intended to support compliance with applicable data protection laws, including India\'s Digital Personal Data Protection Act, 2023 and applicable rules, GDPR, UK GDPR, CCPA/CPRA and other applicable privacy legislation.',
      },
    ],
  },
  {
    id: "definitions",
    number: "33",
    title: "Definitions",
    blocks: [
      {
        type: "dl",
        items: [
          {
            term: "Applicable Data Protection Law",
            definition:
              "any applicable data protection, privacy, cybersecurity or electronic communications law governing processing of Personal Data.",
          },
          {
            term: "Customer Data",
            definition: "Personal Data processed by ConsentGuru on behalf of the Customer.",
          },
          {
            term: "Data Fiduciary",
            definition: "as defined under applicable Indian data protection law.",
          },
          {
            term: "Data Controller",
            definition: "entity determining purposes and means of processing Personal Data.",
          },
          {
            term: "Data Processor",
            definition: "entity processing Personal Data on behalf of a Data Fiduciary or Data Controller.",
          },
          {
            term: "Data Principal",
            definition: "individual to whom Personal Data relates.",
          },
          {
            term: "Personal Data",
            definition:
              "information relating to an identified or identifiable individual or equivalent protected information.",
          },
          {
            term: "Processing",
            definition:
              "collecting, recording, organising, storing, retrieving, using, transmitting, modifying, disclosing, restricting or deleting Personal Data.",
          },
          {
            term: "Security Incident",
            definition:
              "confirmed breach of security resulting in accidental or unlawful destruction, loss, alteration, unauthorised disclosure of or access to Personal Data.",
          },
          {
            term: "Sub-processor",
            definition: "third party appointed by ConsentGuru to process Customer Data on behalf of the Customer.",
          },
        ],
      },
    ],
  },
  {
    id: "roles",
    number: "34",
    title: "Roles of the Parties",
    blocks: [
      {
        type: "p",
        text: "For Customer Data processed through ConsentGuru, the Customer generally acts as the Data Fiduciary, Data Controller or equivalent entity, while ConsentGuru generally acts as the Data Processor, service provider or equivalent entity. The Customer determines the purposes of processing. ConsentGuru processes Customer Data only for the purposes described in the Agreement, this DPA and documented instructions. Nothing in this DPA transfers the Customer's responsibility for determining the purpose or lawful basis of processing.",
      },
    ],
  },
  {
    id: "subject-matter",
    number: "35",
    title: "Subject Matter and Nature of Processing",
    blocks: [
      {
        type: "p",
        text: "ConsentGuru may process Customer Data to provide consent management, cookie management, privacy preference management, consent records, audit trails, reporting, APIs and integrations, technical support, security and service maintenance, and related privacy technology services. Processing may include receiving, recording, organising, storing, retrieving, transmitting, synchronising, reporting and deleting information.",
      },
    ],
  },
  {
    id: "categories-of-data",
    number: "36",
    title: "Categories of Personal Data",
    blocks: [
      {
        type: "p",
        text: "Depending on the Customer's configuration, Customer Data may include name, email address, telephone number, account identifiers, user identifiers, IP addresses, device information, cookie identifiers, online identifiers, consent records, privacy preferences, marketing preferences, communication preferences, date and time of consent, withdrawal records, technical logs and other Personal Data submitted by the Customer.",
      },
    ],
  },
  {
    id: "categories-of-principals",
    number: "37",
    title: "Categories of Data Principals",
    blocks: [
      {
        type: "p",
        text: "Customer Data may relate to customers, website visitors, application users, employees, contractors, students, patients, members, subscribers, prospective customers and other individuals whose Personal Data is processed by the Customer.",
      },
    ],
  },
  {
    id: "customer-responsibilities",
    number: "38",
    title: "Customer Responsibilities",
    blocks: [
      {
        type: "p",
        text: "The Customer shall ensure an appropriate legal basis for processing; provide appropriate privacy notices; obtain valid consent where required; ensure consent requests are clear; provide withdrawal mechanisms; respond to Data Principal requests where responsible; configure ConsentGuru appropriately; avoid unnecessary Personal Data; comply with Applicable Data Protection Law; and provide lawful and documented instructions to ConsentGuru. The Customer remains responsible for its privacy notices, consent notices, processing purposes and configuration.",
      },
    ],
  },
  {
    id: "consentguru-responsibilities",
    number: "39",
    title: "ConsentGuru Responsibilities",
    blocks: [
      {
        type: "p",
        text: "ConsentGuru shall process Customer Data in accordance with the Agreement and documented instructions; maintain appropriate security measures; restrict access to authorised personnel; maintain confidentiality; assist the Customer where reasonably necessary; maintain appropriate processing records where required; notify the Customer of applicable Security Incidents; manage Sub-processors in accordance with this DPA; and delete or return Customer Data as required.",
      },
    ],
  },
  {
    id: "confidentiality",
    number: "40",
    title: "Confidentiality",
    blocks: [
      {
        type: "p",
        text: "ConsentGuru shall ensure that personnel authorised to process Customer Data access it only where necessary, receive appropriate privacy and security instructions, and are subject to confidentiality obligations. These obligations continue after termination of employment or access.",
      },
    ],
  },
  {
    id: "security-measures",
    number: "41",
    title: "Security Measures",
    blocks: [
      {
        type: "p",
        text: "ConsentGuru shall maintain reasonable technical and organisational security measures appropriate to the risks associated with processing Customer Data. These may include encryption in transit, encryption or equivalent protection at rest, access controls, authentication, role-based access, logging, monitoring, vulnerability management, backup and recovery, security testing, incident response, access reviews, personnel security and business continuity measures.",
      },
    ],
  },
  {
    id: "security-incidents",
    number: "42",
    title: "Security Incidents",
    blocks: [
      {
        type: "p",
        text: "ConsentGuru shall notify the Customer without undue delay after becoming aware of a confirmed Security Incident affecting Customer Data where notification is required by Applicable Data Protection Law or the Agreement. Where reasonably available, notification may describe the nature of the incident, categories of Personal Data affected, categories or approximate number of affected individuals, likely consequences, measures taken and relevant contact information. ConsentGuru shall take reasonable steps to contain, investigate and mitigate the incident.",
      },
    ],
  },
  {
    id: "sub-processors",
    number: "43",
    title: "Sub-processors",
    blocks: [
      {
        type: "p",
        text: "The Customer authorises ConsentGuru to use appropriate third-party service providers necessary to provide the Services, including cloud infrastructure, storage, security, analytics, customer support, communication, payment and other technology providers. ConsentGuru shall impose appropriate data protection obligations on Sub-processors and remain responsible for its Sub-processors to the extent required by Applicable Data Protection Law.",
      },
    ],
  },
  {
    id: "dpa-transfers",
    number: "44",
    title: "International Transfers",
    blocks: [
      {
        type: "p",
        text: "Where Customer Data is transferred outside the jurisdiction in which it was collected, ConsentGuru shall implement safeguards required by Applicable Data Protection Law. These may include adequacy mechanisms, standard contractual clauses, contractual safeguards, approved transfer mechanisms or other legally recognised safeguards.",
      },
    ],
  },
  {
    id: "assistance",
    number: "45",
    title: "Assistance with Data Principal Rights",
    blocks: [
      {
        type: "p",
        text: "Taking into account the nature of processing, ConsentGuru shall provide reasonable assistance to the Customer in responding to Data Principal requests where technically feasible and legally required. Such requests may include access, correction, deletion, withdrawal of consent, restriction, objection, portability and other applicable rights.",
      },
    ],
  },
  {
    id: "assessments",
    number: "46",
    title: "Data Protection Assessments",
    blocks: [
      {
        type: "p",
        text: "Where reasonably required, ConsentGuru shall provide information reasonably necessary for the Customer to assess privacy and security risks associated with the Services. The Customer remains responsible for determining whether it is required to conduct a Data Protection Impact Assessment or equivalent assessment.",
      },
    ],
  },
  {
    id: "regulatory",
    number: "47",
    title: "Regulatory Cooperation",
    blocks: [
      {
        type: "p",
        text: "Where legally required, ConsentGuru shall provide reasonable cooperation and information necessary for the Customer to demonstrate compliance with Applicable Data Protection Law. Nothing requires ConsentGuru to disclose confidential information belonging to another customer or information protected by law.",
      },
    ],
  },
  {
    id: "audits",
    number: "48",
    title: "Audits",
    blocks: [
      {
        type: "p",
        text: "The Customer may request reasonable information concerning ConsentGuru's data protection and security practices. Where required by law, the parties may agree to an appropriate audit mechanism. Audits shall be conducted with reasonable advance notice, during reasonable business hours, with minimal disruption and subject to confidentiality and security requirements.",
      },
    ],
  },
  {
    id: "return-deletion",
    number: "49",
    title: "Return and Deletion of Customer Data",
    blocks: [
      {
        type: "p",
        text: "Upon termination or expiry of the Services, ConsentGuru shall, subject to the Agreement and Applicable Data Protection Law, return Customer Data where technically feasible and contractually required or delete Customer Data. ConsentGuru may retain limited information where required by law or reasonably necessary to establish or defend legal claims.",
      },
    ],
  },
  {
    id: "government-requests",
    number: "50",
    title: "Government Requests",
    blocks: [
      {
        type: "p",
        text: "If ConsentGuru receives a legally binding request from a government authority for Customer Data, ConsentGuru may disclose the information where legally required. Where legally permitted, ConsentGuru will provide reasonable notice to the Customer and seek to limit disclosure to the information legally required.",
      },
    ],
  },
  {
    id: "no-sale",
    number: "51",
    title: "No Sale of Customer Data",
    blocks: [
      {
        type: "p",
        text: "ConsentGuru will not sell Customer Data or use Customer Data for unrelated advertising or marketing purposes. ConsentGuru may use aggregated or anonymised information that no longer identifies an individual for service improvement, security analysis, statistical analysis, product development and business reporting, subject to Applicable Data Protection Law.",
      },
    ],
  },
  {
    id: "sensitive-data",
    number: "52",
    title: "Sensitive or Special-Category Data",
    blocks: [
      {
        type: "p",
        text: "Customers should not provide sensitive or special-category Personal Data to ConsentGuru unless such processing is necessary, supported by the Services and permitted by Applicable Data Protection Law. Where such processing is required, appropriate additional safeguards shall be implemented where reasonably necessary.",
      },
    ],
  },
  {
    id: "children-minors",
    number: "53",
    title: "Children and Minors",
    blocks: [
      {
        type: "p",
        text: "Where Customer Data relates to children or minors, the Customer is responsible for ensuring that applicable age-related safeguards, parental or guardian consent and other legal requirements are satisfied. ConsentGuru shall process such information only in accordance with the Customer's documented instructions and the Agreement.",
      },
    ],
  },
  {
    id: "dpo",
    number: "54",
    title: "Data Protection Officer",
    blocks: [
      {
        type: "p",
        text: "ConsentGuru's Data Protection Officer is Shijas Ahmed, shijas@consentguru.com. The DPO may be contacted regarding privacy and data protection matters relating to ConsentGuru's processing activities.",
      },
    ],
  },
  {
    id: "precedence",
    number: "55",
    title: "Precedence",
    blocks: [
      {
        type: "p",
        text: "If there is a conflict between this DPA and another agreement concerning the processing of Personal Data, this DPA shall apply to the extent of the conflict concerning data protection obligations, unless the parties expressly agree otherwise in writing.",
      },
    ],
  },
  {
    id: "dpa-changes",
    number: "56",
    title: "Changes to the DPA",
    blocks: [
      {
        type: "p",
        text: "ConsentGuru may update this DPA where reasonably necessary to reflect changes in Applicable Data Protection Law, the ConsentGuru Services, security practices, Sub-processors or processing activities. Where a material change materially affects the Customer's data protection obligations, ConsentGuru shall provide reasonable notice where required.",
      },
    ],
  },
  {
    id: "term",
    number: "57",
    title: "Term and Survival",
    blocks: [
      {
        type: "p",
        text: "This DPA shall remain effective for as long as ConsentGuru processes Customer Data on behalf of the Customer. Confidentiality, security, deletion, regulatory cooperation and other provisions that by their nature should survive termination shall continue to apply to the extent required by Applicable Data Protection Law.",
      },
    ],
  },
  {
    id: "dpa-contact",
    number: "58",
    title: "Contact",
    blocks: [
      {
        type: "p",
        text: "ConsentGuru, #10, Second Floor, Manasa Towers, MG Road, Mangalore - 575003, Karnataka, India. General Privacy Contact: support@consentguru.com. Data Protection Officer: Shijas Ahmed, shijas@consentguru.com. Website: www.consentguru.com.",
      },
    ],
  },
  {
    id: "appendix-a",
    title: "Appendix A — Processing Details",
    blocks: [
      {
        type: "dl",
        items: [
          {
            term: "Subject Matter",
            definition:
              "Consent management, cookie management, privacy preference management, consent records, audit trails and related privacy technology services.",
          },
          {
            term: "Duration",
            definition:
              "For the duration of the Customer's subscription or contractual relationship with ConsentGuru, together with any applicable retention or deletion period.",
          },
          {
            term: "Nature of Processing",
            definition:
              "Collection, recording, organisation, storage, retrieval, use, transmission, synchronisation, reporting, deletion and other processing necessary to provide the Services.",
          },
          {
            term: "Purpose",
            definition:
              "To provide ConsentGuru services in accordance with the Customer's instructions and the Agreement.",
          },
          {
            term: "Categories of Data Principals",
            definition:
              "Customers, users, website visitors, employees, contractors, members, subscribers, prospective customers, students, patients and other individuals whose information is submitted by the Customer.",
          },
          {
            term: "Categories of Personal Data",
            definition:
              "Identity information, contact information, online identifiers, device information, IP addresses, cookie identifiers, consent records, privacy preferences, marketing preferences, communication preferences, timestamps, technical logs and other information configured or submitted by the Customer.",
          },
          {
            term: "Special Categories",
            definition:
              "ConsentGuru should not be used to process sensitive or special-category Personal Data unless expressly agreed or supported by the applicable Services and appropriate safeguards are in place.",
          },
          {
            term: "Processing Locations",
            definition:
              "Customer Data may be processed in India and/or other jurisdictions in which ConsentGuru or its authorised service providers operate, subject to Applicable Data Protection Law and appropriate safeguards.",
          },
          {
            term: "Data Protection Contact",
            definition: "Shijas Ahmed, Data Protection Officer, shijas@consentguru.com",
          },
        ],
      },
    ],
  },
];

export const PRIVACY_CENTRE_PARTS = [
  {
    part: "Part I",
    href: "/privacy-center/privacy-policy",
    title: "Privacy Policy",
    description:
      "What information ConsentGuru may collect, how we use it, when we share it, how we protect it, and the choices available to individuals.",
  },
  {
    part: "Part II",
    href: "/privacy-center/cookie-policy",
    title: "Cookie Policy",
    description:
      "How cookies and similar technologies work on ConsentGuru, the categories we may use, and how you can manage preferences.",
  },
  {
    part: "Part III",
    href: "/privacy-center/data-processing-agreement",
    title: "Data Processing Agreement",
    description:
      "Responsibilities and safeguards when ConsentGuru processes Personal Data on behalf of a Customer, including DPDP, GDPR and CCPA/CPRA.",
  },
  {
    part: "Part IV",
    href: "/privacy-center/data-principal-request",
    title: "Data Principal Rights",
    description:
      "Submit and track access, correction, erasure, nomination, and other Data Principal requests under the Digital Personal Data Protection Act, 2023.",
  },
  {
    part: "Part V",
    href: "/privacy-center/grievance",
    title: "File a Grievance",
    description:
      "Lodge and track a grievance with Consent Guru's Data Protection Officer under Section 13 of the Digital Personal Data Protection Act, 2023.",
  },
] as const;
