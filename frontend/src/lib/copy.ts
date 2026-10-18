// All English UI copy in one place (frontend/CLAUDE.md rule 11).
export const copy = {
  app: {
    name: 'CampaignOps',
    campaign: 'Demo Travel (NZ) · China Tour 2027',
    demoClock: 'Demo clock',
    demoClockHelp:
      'Demo time starts at the seed instant (Thu 15 Oct 2026, 10:00 NZDT) and runs from the last reset.',
    hours: 'Hours this week',
    checkpoint: 'Next checkpoint',
    roleLabel: 'Acting as',
    roleHelp:
      'Switch role to see what each person can do. Actions you cannot take stay visible and say who can.',
    mockBadge: 'Mock data',
    mockHelp:
      'Runs entirely in this browser with simulated agents and integrations. Nothing is sent anywhere.',
  },
  nav: {
    dashboard: 'Dashboard',
    workflow: 'Workflow',
    facts: 'Fact Sheet',
    evidence: 'Evidence',
    tasks: 'Tasks',
    agents: 'Agents',
    factory: 'Video factory',
    publish: 'Publish',
    leads: 'Leads',
    settings: 'Settings',
  },
  pages: {
    dashboard: {
      title: 'Dashboard',
      lede: 'Three questions before any paid traffic: can we sell it, catch enquiries, and measure them?',
    },
    facts: {
      title: 'Fact Sheet',
      lede: 'The only source for anything said publicly. Unconfirmed entries cannot be cited.',
    },
    evidence: {
      title: 'Evidence & backlog',
      lede: 'What the Audit agent or the PM found, with proof. Items become tasks.',
    },
    tasks: {
      title: 'Tasks',
      lede: 'Draft → QA → client approval → live → verified. Moves are only allowed where the rules allow them.',
    },
    agents: {
      title: 'Agents',
      lede: 'Three read-only agents. Each output waits for a person to accept or reject it.',
    },
    factory: {
      title: 'Video factory',
      lede: 'Briefs out, receipts in. Duplicate check by task, QA against allowed facts and cost cap.',
    },
    publish: {
      title: 'Publish packages',
      lede: 'One record per post: asset version + caption version + link. Approval binds to versions.',
    },
    leads: {
      title: 'Leads',
      lede: 'The CRM is the only ledger for results. Validity is separate from sales stage.',
    },
    settings: {
      title: 'Settings',
      lede: 'Pre-approved scope, people, links and the landing-page gate.',
    },
    workflow: {
      title: 'Workflow',
      lede: 'The ten steps of the China Tour 2027 plan, and where each one stands right now.',
    },
  },
  guardrail: 'Read-only. Produces drafts and suggestions only. A person accepts each item.',
  readOnly: (role: string, who: string) => `Read-only for ${role}. Switch role to ${who} to edit.`,
  placeholderHelp: 'Placeholder: not confirmed yet. Never published as a value.',
  internalFactWarning:
    'An internal Fact Sheet entry is referenced on outbound work. This should never happen: remove it before approval.',
  zeroCpl: 'No valid leads yet',
  taskQa: [
    'Matches channel spec (length, link at end)',
    'Every fact has an FS id and is publicly usable',
    'No prohibited words',
    'UTM link generated from template, unedited',
  ],
  columns: {
    draft: 'Draft',
    qa: 'QA',
    awaiting_approval: 'Client approval',
    approved: 'Approved',
    live: 'Live',
    verified: 'Verified',
    blocked: 'Blocked',
  },
  workflow: {
    sourceUrl: 'https://claude.ai/artifact/TpdZz945Dm6MVEvLeBNLFN',
    sourceLabel: 'Source workflow (Chinese)',
    groups: { kickoff: 'Once, at kickoff', task: 'Every task', weekly: 'Weekly loop' },
    loop: 'Changes outside the pre-approved scope go back to step 4, new tasks to step 5, and every two weeks the plan returns to step 2.',
    gate: 'Client approval',
    steps: [
      {
        n: 1,
        group: 'kickoff',
        title: 'Fact Sheet and task board',
        summary:
          'One sheet of facts (external and internal pages), one board. Assumptions are written down too.',
        roles: ['PM'],
      },
      {
        n: 2,
        group: 'kickoff',
        title: 'Audit the current state',
        summary:
          'Site, tracking, channels, SEO and the GEO baseline. Read-only; every finding has proof.',
        roles: ['Audit agent'],
      },
      {
        n: 3,
        group: 'kickoff',
        title: 'Verify and prioritise',
        summary:
          'Spot-check the evidence, merge duplicates, order by impact; every item gets an owner.',
        roles: ['PM'],
      },
      {
        n: 4,
        group: 'kickoff',
        title: 'Client confirms facts, budget and scope',
        summary: 'Dates, price, seats, itinerary; budget and the pre-approved scope; who approves.',
        roles: ['Client'],
        gate: true,
      },
      {
        n: 5,
        group: 'task',
        title: 'Produce',
        summary: 'Outbound drafts with an FS id after every fact; video briefs go to the factory.',
        roles: ['Outbound agent', 'Video factory'],
      },
      {
        n: 6,
        group: 'task',
        title: 'QA',
        summary: 'The agent checks first; the PM re-checks visa, price and dates in person.',
        roles: ['Outbound agent', 'PM'],
      },
      {
        n: 7,
        group: 'task',
        title: 'Client approves exact versions',
        summary:
          'Publish packages, site changes and out-of-scope ad changes. Approval binds the version.',
        roles: ['Client'],
        gate: true,
      },
      {
        n: 8,
        group: 'task',
        title: 'Go live and verify',
        summary:
          'Executor publishes after the duplicate check; Outbound compares live with approved.',
        roles: ['Executor', 'Outbound agent'],
      },
      {
        n: 9,
        group: 'weekly',
        title: 'Take enquiries, read results',
        summary: 'Every enquiry in the CRM with its source; Feedback reconciles twice a week.',
        roles: ['Sales', 'Feedback agent'],
      },
      {
        n: 10,
        group: 'weekly',
        title: 'Decide the next round',
        summary:
          'In-scope changes go ahead; the rest go back to the client. One adjustment a week.',
        roles: ['PM'],
      },
    ],
    exceptions: [
      [
        'Landing page broken or tracking down',
        'The named person pauses ads under prior authority; resume after the fix is verified.',
        'Settings › Landing page checks; the ad gate blocks launches; Feedback raises an "Act now" anomaly',
      ],
      [
        'Product facts changed (date cancelled, sold out, new price)',
        'Find everything citing the FS id, pause schedules, take down or correct what is live.',
        'Fact Sheet › History lists every flagged task, package and brief',
      ],
      [
        'AI wrote an unconfirmed visa claim or date',
        'QA stops it; if live, take it down and find which step let it through.',
        'Outbound returns needs_confirmation; approval and scheduling refuse unconfirmed facts',
      ],
      [
        'Video production failed or late',
        'Stop at the retry cap; move the schedule; never skip QA.',
        'Video factory › Return to factory (new receipt version, re-render cap)',
      ],
      [
        'Approval never came',
        'Remind once at the deadline; otherwise it waits. Nothing ships unapproved.',
        'Dashboard › Awaiting client approval',
      ],
      [
        'Publish call timed out',
        'Check the platform first, then decide whether to retry.',
        'Not simulated in the demo',
      ],
      [
        'Live content differs from approved',
        'Take it down or make it private, record the diff, restore the approved version.',
        'Agents › Outbound verify → mismatch; Publish › Take down',
      ],
      [
        'Views up, no enquiries',
        'Check links and UTM, the landing page, the form and Lead event, then content and audience.',
        'Dashboard funnel; Feedback funnel observation',
      ],
    ],
    rules: [
      [
        'Context',
        'Each agent gets only what this task needs; product facts come from the Fact Sheet, never from chat memory.',
      ],
      [
        'Client data',
        'Only the Feedback agent reads CRM data and the internal page, and only the de-identified export.',
      ],
      [
        'Versions',
        'Fact Sheet, briefs, assets and packages are versioned; approval follows the version.',
      ],
      [
        'Cost and retries',
        'Every kind of task has a retry and cost cap; check for duplicates before sending; over the cap goes to the PM.',
      ],
      [
        'Manual first',
        'For the first four weeks the agents are three fixed prompts run by hand; automate once they are stable.',
      ],
      [
        'Not an agent job',
        'UTM from a template, lead sync by CRM integration, spend pauses by platform rules, video by the existing factory.',
      ],
    ],
  },
} as const;
