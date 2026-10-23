import { chapters } from '../chapters'
import type { Law } from '../law'
import { stations } from '../stations'

/** India's Digital Personal Data Protection Act, 2023. */
export const dpdp: Law = {
  id: 'dpdp',
  hero: {
    name: 'Digital Personal Data Protection Act',
    year: '2023',
    lead: 'India’s data protection law in eight stops. Follow one piece of personal data, try each idea on the model, and open the details when you want the full text.',
  },
  colophon: {
    about:
      'A plain-language walkthrough of India’s Digital Personal Data Protection Act, 2023, written for people who have never read it. The 3D layer illustrates the text beside it; every explanation is also written in the page, so nothing is lost without it.',
    legal:
      'This is a general explanation, not legal advice, a legal opinion, or a compliance certification. Duties, exemptions, timelines, notice format, breach intimation, children’s-data verification, Consent Manager registration and penalties depend on the Act, the Rules, government notifications and guidance from the Data Protection Board. Some obligations take effect on dates the Central Government notifies. Read the official text, and obtain advice from qualified counsel for your own processing.',
  },
  sourcePrefix: 'Source: ConsentGuru DPDP guide, ',
  stations,
  chapters,
  scene: {
    people: {
      principal: 'You · Data Principal',
      principalHover: 'You: the Data Principal',
      fiduciary: 'Data Fiduciary',
      processor: 'Data Processor',
      responsibility: 'responsibility stays',
      data: 'your data',
      short: { fiduciary: 'Fiduciary', processor: 'Processor' },
    },
    reason: {
      bar: 'Holding it is not a reason',
      purpose: 'purpose',
      consent: 'Consent',
      legitimate: 'Legitimate use',
      shortcut: '“legitimate” shortcut',
      shortcutHover: 'A relabelled shortcut',
      processing: 'processing',
    },
    consent: { checks: ['clear action', 'informed', 'free'], notice: 'Notice', noticeHover: 'An itemised notice' },
    withdrawal: {
      past: 'the past stays lawful',
      record: 'Consent record',
      versions: 'notice versions, kept',
      necessary: 'necessary runs on',
      told: 'told in turn',
    },
    rights: {
      you: 'You',
      holder: 'Data Fiduciary',
      rights: [
        { label: 'Access', tool: 'access' },
        { label: 'Correction', tool: 'correction' },
        { label: 'Erasure', tool: 'erasure' },
        { label: 'Grievance', tool: 'complaint' },
        { label: 'Nomination', tool: 'nomination' },
        { label: 'Withdrawal', tool: 'withdrawal' },
      ],
      duties: ['Consent handling', 'Lawful processing', 'Security', 'Accuracy', 'Rights & grievances', 'Processor contracts', 'Retention & deletion'],
      extra: 'Significant Data Fiduciaries only',
    },
    stricter: [
      {
        kind: 'room',
        subject: 'A child’s data',
        gatekeeper: 'parent or guardian',
        gatekeeperHover: 'A parent or lawful guardian',
        gatekeeperShape: 'person',
        check: 'prescribed check',
        checkHover: 'Verification, as the Rules prescribe',
        reaches: ['tracking', 'monitoring', 'targeted ads', 'detrimental use'],
      },
      {
        kind: 'holders',
        left: 'Consent Manager',
        leftHover: 'Consent Manager: registered, accountable to you',
        right: 'Platform (software)',
        rightHover: 'A consent management platform: software',
        you: 'you',
        organisation: 'organisation',
        authority: 'Data Protection Board',
      },
    ],
    system: { person: 'a person, throughout', boundary: 'wider duties, beyond the banner' },
  },
}
