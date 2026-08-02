export type AgentFaqItem = {
  question: string;
  answer: string;
};

export type AgentFaqSection = {
  id: string;
  title: string;
  items: AgentFaqItem[];
};

export const AGENT_FAQ_SECTIONS: AgentFaqSection[] = [
  {
    id: 'account',
    title: 'Account & access',
    items: [
      {
        question: 'How do I sign in to the Agent Portal?',
        answer:
          'Use the email and password from your agency invite, or register through a team invite link. After sign-in, complete the system access agreement and any password-change prompts before accessing your portfolio.',
      },
      {
        question: 'What is the difference between inspection-only and full management access?',
        answer:
          'Inspection-only agencies see Dashboard, Properties, and Inspections. Full management adds Leasing, Maintenance, Accounting, Archive, and related workflows. Your agency’s portal service level controls which modules appear in the sidebar.',
      },
      {
        question: 'Why is my account billing-blocked?',
        answer:
          'If platform billing is overdue, the portal may restrict access until payment is cleared. Open Bill from the sidebar to pay, or contact CROSSUB support if you believe the block is in error.',
      },
      {
        question: 'How do I invite team members?',
        answer:
          'From Profile or agency settings, send team invites so colleagues can register with the same agency scope. Each member needs their own login — staff accounts cannot use the Tenant app.',
      },
    ],
  },
  {
    id: 'portfolio',
    title: 'Portfolio & dashboard',
    items: [
      {
        question: 'What does the Dashboard show?',
        answer:
          'Dashboard summarises occupancy, rent, arrears, open maintenance, and inspection activity across your assigned properties. Need-action items link directly to approvals and overdue workflow steps.',
      },
      {
        question: 'How do I navigate a property?',
        answer:
          'Open Properties, select an address, then use the property hub tabs — Overview, Leasing, Maintenance, Inspections, Accounting, Tribunal, Documents, History, and Fees. Most workflows start from the relevant tab.',
      },
      {
        question: 'What is the Need Action queue?',
        answer:
          'Tasks lists portfolio alerts requiring your decision — quote approvals, rent reviews, tenant applications, inspection follow-ups, and overdue onboarding steps. Filter by property from the property hub or open Tasks globally.',
      },
      {
        question: 'How does search work?',
        answer:
          'Global search finds properties, cases, contacts, and threads by address or reference. Use it from the header search icon when you know a tracking number or street name.',
      },
    ],
  },
  {
    id: 'leasing',
    title: 'Leasing & tenants',
    items: [
      {
        question: 'How do I run a new leasing cycle?',
        answer:
          'From the property Leasing tab, start new leasing for a vacant property. Track applicant shortlisting, approval, deposit and bond collection, lease signing, key handover, and tenant portal provisioning.',
      },
      {
        question: 'How do I provision a tenant portal account?',
        answer:
          'After approving an application, send tenant login credentials from the tenant accounts screen (Settings → Tenant accounts when available). The tenant uses those credentials in the CROSSUB Tenant app to complete onboarding.',
      },
      {
        question: 'What are open inspections for advertising?',
        answer:
          'Open inspections schedule viewings while a property is on the market. Register attendees and link interested applicants into tenant selection without an active lease.',
      },
      {
        question: 'How does tenant selection work?',
        answer:
          'Tenant Selection ranks applicants for a property. Compare applications, shortlist, approve or decline, then hand off to new-leasing onboarding for the successful tenant.',
      },
    ],
  },
  {
    id: 'maintenance',
    title: 'Maintenance',
    items: [
      {
        question: 'How do I triage a tenant maintenance report?',
        answer:
          'Open Maintenance from the property or global list. Review the tenant’s description and photos, confirm responsibility (tenant, landlord, or strata), set priority, and route to internal work or contractor quoting.',
      },
      {
        question: 'How do quote approvals work?',
        answer:
          'When contractors submit quotes, you approve or decline from the job detail screen. Approved jobs move to scheduling and execution; tenants see status updates in their app and can approve completion when work finishes.',
      },
      {
        question: 'Can I message the tenant or contractor about a job?',
        answer:
          'Yes. Maintenance threads appear under Messages with a maintenance category. Start a thread from the job detail or reply to notifications when status changes require your input.',
      },
    ],
  },
  {
    id: 'inspections',
    title: 'Inspections',
    items: [
      {
        question: 'What inspection types can I manage?',
        answer:
          'Open (advertising), Ingoing (move-in), Outgoing (move-out), and Routine (periodic). Each type has its own list filter and workflow stage on the property Inspections tab.',
      },
      {
        question: 'How do routine self-inspections work?',
        answer:
          'Assign a self-inspection to the tenant when appropriate. They complete the checklist in the Tenant app; you review photos and notes when submitted and follow up on flagged maintenance items.',
      },
      {
        question: 'When is an ingoing report confirmed?',
        answer:
          'The tenant confirms each section of the ingoing condition report in the Tenant app. Move-in is official once onboarding, bond, and ingoing confirmation are complete.',
      },
    ],
  },
  {
    id: 'financial',
    title: 'Rent, accounting & disputes',
    items: [
      {
        question: 'How do I run a rent review?',
        answer:
          'From Leasing → Rent review, open a case when a lease is approaching expiry or a periodic review is due. Complete market research, obtain landlord approval, dispatch the tenant notice, and track accept/decline/counter responses.',
      },
      {
        question: 'Where do I see rent and arrears?',
        answer:
          'Accounting on the property hub shows rent ledger, receipts, charges, and arrears. Tenants pay and upload proofs through the Tenant app; you reconcile and chase from here.',
      },
      {
        question: 'When do I use Tribunal?',
        answer:
          'Tribunal tracks NCAT-style dispute cases — preparation, filing, hearing dates, and outcomes — when rent chasing or lease disputes escalate beyond standard messaging.',
      },
      {
        question: 'What is in Archive?',
        answer:
          'Archive holds closed or cancelled leasing, maintenance, and inspection cases for reference without cluttering active lists.',
      },
    ],
  },
  {
    id: 'communications',
    title: 'Messages & notifications',
    items: [
      {
        question: 'How do I message a tenant or landlord?',
        answer:
          'Open Messages, start a new thread, and select the property and participant. Topics include leasing, maintenance, inspection, and accounting so conversations stay organised.',
      },
      {
        question: 'What is the Communications log?',
        answer:
          'Communications links your agency mailbox (Gmail or Yahoo) to property-scoped email threads. Use it to see inbound mail alongside in-app messages.',
      },
      {
        question: 'How do notifications work?',
        answer:
          'The bell shows approvals, urgent maintenance, inspection updates, and billing alerts. Adjust categories under Settings → Notifications — preferences save on this device.',
      },
      {
        question: 'What is Gii?',
        answer:
          'Gii is the built-in AI assistant on desktop. Ask for property briefings, workflow help, or drafting support. It appears in the right panel on larger screens.',
      },
    ],
  },
  {
    id: 'support',
    title: 'Billing, agreements & help',
    items: [
      {
        question: 'Where do I view pricing and pay my bill?',
        answer:
          'Pricing lists platform fees and service catalog items. Bill shows your current invoice and Stripe payment options. Keep billing current to avoid portal restrictions.',
      },
      {
        question: 'What are Sales agreements?',
        answer:
          'Agreements tracks your agency’s CROSSUB sales agreement and related documents. Complete any required signing before full portal features unlock.',
      },
      {
        question: 'How do page guides work?',
        answer:
          'Short guides appear the first time you open each main section. Replay them from Settings → Help → Replay page guides if you want a refresher.',
      },
      {
        question: 'Who do I contact for platform support?',
        answer:
          'Message CROSSUB through the staff support thread in Messages, or use in-app notifications when CROSSUB reaches out about billing or account issues.',
      },
    ],
  },
];
