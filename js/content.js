/**
 * content.js
 * Single source of truth for copy, project data, stack data, and the
 * systems-graph (nodes/edges/clusters) that drives the WebGL scene.
 * Kept separate from scene.js and main.js on purpose — see architecture note
 * in main.js header.
 */

/* ---------------------------------------------------------------------- */
/* SECTIONS — order defines both the DOM order and the camera journey.     */
/* Each has a `cluster` anchor (camera position + look target in the       */
/* systems graph) used by scene.js to fly between "environments".         */
/* ---------------------------------------------------------------------- */
export const SECTIONS = [
  {
    id: 'hero',
    number: '00',
    label: 'Index',
    nav: 'Index',
    cluster: { pos: [0, 1.5, 30], look: [0, 0, 0], fov: 50 },
  },
  {
    id: 'ecosystem',
    number: '01',
    label: 'Technology Ecosystem',
    nav: 'Ecosystem',
    cluster: { pos: [-9, 3.2, 15], look: [-6.5, 1.2, 1], fov: 46 },
  },
  {
    id: 'capabilities',
    number: '02',
    label: 'Engineering Capabilities',
    nav: 'Engineering',
    cluster: { pos: [3.5, -2.4, 11], look: [5, -0.8, -1.5], fov: 44 },
  },
  {
    id: 'ai-lab',
    number: '03',
    label: 'AI & Automation Laboratory',
    nav: 'AI Lab',
    cluster: { pos: [11.5, 4.6, 9], look: [12.5, 3.2, 0.5], fov: 42 },
  },
  {
    id: 'learning',
    number: '04',
    label: 'Learning Technology',
    nav: 'Learning',
    cluster: { pos: [-13, -3.6, 10], look: [-14, -4.6, 2], fov: 44 },
  },
  {
    id: 'infrastructure',
    number: '05',
    label: 'Cloud & Infrastructure',
    nav: 'Infrastructure',
    cluster: { pos: [7, -6.4, 12], look: [8.5, -7.2, 3], fov: 44 },
  },
  {
    id: 'solutions',
    number: '06',
    label: 'Selected Digital Solutions',
    nav: 'Solutions',
    cluster: { pos: [0, 4, 33], look: [0, -0.5, 0], fov: 52 },
  },
  {
    id: 'contact',
    number: '07',
    label: 'Contact & Manifesto',
    nav: 'Contact',
    cluster: { pos: [0, 0.4, 6.2], look: [0, 0, 0], fov: 40 },
  },
];

/* ---------------------------------------------------------------------- */
/* SYSTEMS GRAPH — hand-placed, not randomised. Each cluster of nodes     */
/* sits near its section's camera anchor above. Edges encode real         */
/* relationships (a request path, a data pipeline, an integration).       */
/* kind: 'infra' | 'ai' | 'integration' | 'learning' | 'core'             */
/* ---------------------------------------------------------------------- */
export const NODES = [
  // -- core / hero overview -------------------------------------------------
  { id: 'core', label: 'Digital Solutions', sub: 'root', pos: [0, 0, 0], kind: 'core', size: 1.6 },

  // -- ecosystem cluster (stack) ---------------------------------------------
  { id: 'ts', label: 'TypeScript', sub: 'language', pos: [-6.4, 1.6, 2.2], kind: 'core', size: 0.9 },
  { id: 'node', label: 'Node.js', sub: 'runtime', pos: [-8.1, 2.6, 0.4], kind: 'core', size: 0.95 },
  { id: 'python', label: 'Python', sub: 'language', pos: [-5.2, 3.4, -0.6], kind: 'ai', size: 0.9 },
  { id: 'react', label: 'React', sub: 'interface', pos: [-4.6, -0.2, 2.8], kind: 'core', size: 0.9 },
  { id: 'postgres', label: 'PostgreSQL', sub: 'database', pos: [-9.6, 0.4, 3.4], kind: 'infra', size: 1 },
  { id: 'docker', label: 'Docker', sub: 'runtime', pos: [-7.4, 4.6, 2.6], kind: 'infra', size: 0.85 },
  { id: 'git', label: 'Git', sub: 'version control', pos: [-10.4, 3.2, -0.8], kind: 'core', size: 0.75 },
  { id: 'rest', label: 'REST / GraphQL', sub: 'protocol', pos: [-6.8, -0.8, -1.4], kind: 'integration', size: 0.85 },

  // -- capabilities cluster (interface -> application -> api -> db) --------
  { id: 'ui', label: 'Interface Layer', sub: 'application', pos: [4.6, -0.4, -0.4], kind: 'core', size: 1 },
  { id: 'app', label: 'Application Server', sub: 'application', pos: [6.2, -1.6, -2.2], kind: 'core', size: 1.05 },
  { id: 'api', label: 'API Gateway', sub: 'integration', pos: [7.8, -3.2, -1.4], kind: 'integration', size: 1 },
  { id: 'auth', label: 'Auth Service', sub: 'application', pos: [5.6, -3.6, 1.2], kind: 'core', size: 0.8 },
  { id: 'queue', label: 'Task Queue', sub: 'automation', pos: [8.8, -1.4, 0.6], kind: 'integration', size: 0.85 },
  { id: 'db', label: 'Relational Store', sub: 'database', pos: [9.6, -4.6, -2.8], kind: 'infra', size: 1 },
  { id: 'cache', label: 'Cache Layer', sub: 'database', pos: [7, -5.4, 0.4], kind: 'infra', size: 0.75 },

  // -- ai / automation lab cluster -------------------------------------------
  { id: 'agent', label: 'Automation Agent', sub: 'orchestration', pos: [12.8, 3.4, -0.8], kind: 'ai', size: 1.1 },
  { id: 'embed', label: 'Embeddings', sub: 'contextual data', pos: [14.4, 5.2, 0.6], kind: 'ai', size: 0.9 },
  { id: 'llm', label: 'Language Model', sub: 'inference', pos: [11.2, 6.2, 1.6], kind: 'ai', size: 1 },
  { id: 'vector', label: 'Vector Store', sub: 'database', pos: [15, 2.8, -1.6], kind: 'infra', size: 0.85 },
  { id: 'pipeline', label: 'Automation Pipeline', sub: 'workflow', pos: [10.4, 4.8, -2.4], kind: 'integration', size: 0.9 },
  { id: 'webhook', label: 'Webhook Relay', sub: 'integration', pos: [13.4, 1.8, 2.6], kind: 'integration', size: 0.8 },
  { id: 'notify', label: 'Notification Service', sub: 'application', pos: [16.2, 4.2, 1.2], kind: 'ai', size: 0.75 },

  // -- learning technology cluster (Moodle / Brightspace) --------------------
  { id: 'moodle', label: 'Moodle', sub: 'learning ecosystem', pos: [-14.8, -4.2, 1.6], kind: 'learning', size: 1.15 },
  { id: 'brightspace', label: 'Brightspace / D2L', sub: 'learning ecosystem', pos: [-12.2, -5.6, 2.4], kind: 'learning', size: 1.15 },
  { id: 'lti', label: 'LTI Bridge', sub: 'integration', pos: [-13.4, -2.8, -0.4], kind: 'integration', size: 0.85 },
  { id: 'sis', label: 'Student Records', sub: 'database', pos: [-16.4, -5, 0.4], kind: 'infra', size: 0.85 },
  { id: 'gradebook', label: 'Gradebook Sync', sub: 'automation', pos: [-11.2, -3.2, 3.6], kind: 'integration', size: 0.75 },
  { id: 'sso', label: 'SSO', sub: 'application', pos: [-15.4, -2.4, 2.8], kind: 'core', size: 0.7 },

  // -- cloud & infrastructure cluster (AWS) -----------------------------------
  { id: 'lambda', label: 'Lambda', sub: 'compute', pos: [8.4, -7.6, 1.6], kind: 'infra', size: 1 },
  { id: 's3', label: 'S3', sub: 'storage', pos: [10.6, -6.2, 2.8], kind: 'infra', size: 0.95 },
  { id: 'rds', label: 'RDS', sub: 'database', pos: [6.4, -8.8, 3.4], kind: 'infra', size: 0.95 },
  { id: 'apigw', label: 'API Gateway', sub: 'integration', pos: [9.2, -9.2, 0.6], kind: 'integration', size: 0.85 },
  { id: 'cloudwatch', label: 'CloudWatch', sub: 'observability', pos: [11.6, -8, -0.8], kind: 'infra', size: 0.75 },
  { id: 'ecs', label: 'ECS', sub: 'compute', pos: [5.6, -6.4, 0.2], kind: 'infra', size: 0.85 },
  { id: 'iam', label: 'IAM', sub: 'security', pos: [7.4, -9.8, 2.6], kind: 'infra', size: 0.7 },

  // -- far-field ambience (visible from the wide hero / solutions shots) -----
  { id: 'amb-1', label: '', sub: '', pos: [-20, 8, -14], kind: 'infra', size: 0.5 },
  { id: 'amb-2', label: '', sub: '', pos: [20, 9, -12], kind: 'ai', size: 0.5 },
  { id: 'amb-3', label: '', sub: '', pos: [0, -14, -20], kind: 'learning', size: 0.5 },
  { id: 'amb-4', label: '', sub: '', pos: [-4, 12, -18], kind: 'core', size: 0.45 },
  { id: 'amb-5', label: '', sub: '', pos: [18, -3, -16], kind: 'infra', size: 0.45 },
];

export const EDGES = [
  // core to cluster anchors
  ['core', 'ts'], ['core', 'ui'], ['core', 'agent'], ['core', 'moodle'], ['core', 'lambda'],
  // ecosystem internal
  ['ts', 'node'], ['ts', 'react'], ['node', 'postgres'], ['node', 'docker'], ['node', 'rest'],
  ['react', 'rest'], ['docker', 'git'], ['python', 'node'], ['rest', 'api'],
  // capabilities chain: interface -> app -> api -> db (the brief's example path)
  ['ui', 'app'], ['app', 'auth'], ['app', 'api'], ['api', 'queue'], ['api', 'db'],
  ['queue', 'cache'], ['db', 'cache'], ['app', 'ui'],
  // capabilities -> ai lab (automation handoff)
  ['queue', 'pipeline'], ['api', 'webhook'],
  // ai lab internal
  ['agent', 'llm'], ['agent', 'embed'], ['embed', 'vector'], ['llm', 'vector'],
  ['pipeline', 'agent'], ['pipeline', 'notify'], ['webhook', 'pipeline'], ['agent', 'webhook'],
  // learning cluster internal + integration bridge
  ['moodle', 'lti'], ['brightspace', 'lti'], ['lti', 'sis'], ['moodle', 'gradebook'],
  ['brightspace', 'gradebook'], ['moodle', 'sso'], ['brightspace', 'sso'],
  // learning -> integration -> ai (Moodle -> API -> DB -> AI service -> notification)
  ['lti', 'api'], ['gradebook', 'db'], ['sis', 'db'], ['lti', 'agent'], ['agent', 'notify'],
  // infrastructure cluster internal
  ['lambda', 's3'], ['lambda', 'rds'], ['lambda', 'apigw'], ['apigw', 'ecs'],
  ['ecs', 'rds'], ['lambda', 'cloudwatch'], ['ecs', 'cloudwatch'], ['rds', 'iam'], ['s3', 'iam'],
  // infra bridges to app + ai
  ['apigw', 'api'], ['lambda', 'webhook'], ['s3', 'vector'], ['rds', 'db'],
  // faint ambient long-range connections
  ['amb-1', 'moodle'], ['amb-2', 'agent'], ['amb-3', 'brightspace'], ['amb-4', 'core'], ['amb-5', 'lambda'],
];

/* Pulses: fixed animated "packets" that travel specific edges on a loop,
   chosen to narrate real request paths rather than random shimmer. */
export const PULSE_ROUTES = [
  ['ui', 'app', 'api', 'db'],
  ['moodle', 'lti', 'api', 'agent', 'notify'],
  ['lambda', 'apigw', 'ecs', 'rds'],
  ['agent', 'embed', 'vector'],
  ['brightspace', 'gradebook', 'db'],
  ['webhook', 'pipeline', 'agent', 'llm'],
  ['s3', 'lambda', 'cloudwatch'],
];

/* ---------------------------------------------------------------------- */
/* STACK — presented as an interactive ecosystem list, grouped by domain.  */
/* ---------------------------------------------------------------------- */
export const STACK_GROUPS = [
  {
    title: 'Full Stack',
    items: ['TypeScript', 'Node.js', 'React', 'Python', 'REST & GraphQL APIs', 'PostgreSQL / MySQL'],
  },
  {
    title: 'AI & Automation',
    items: ['LLM integration', 'Embeddings & retrieval', 'Agent orchestration', 'Workflow automation', 'Webhook relays'],
  },
  {
    title: 'Learning Platforms',
    items: ['Moodle (plugins, APIs, theming)', 'Brightspace / D2L (Valence API)', 'LTI 1.3', 'SIS & gradebook sync', 'SSO / SAML'],
  },
  {
    title: 'Cloud & Infrastructure',
    items: ['AWS Lambda', 'S3', 'RDS', 'API Gateway', 'ECS', 'CloudWatch', 'IAM', 'Docker'],
  },
];

/* ---------------------------------------------------------------------- */
/* PROJECTS — problem / solution / architecture / technologies / result.   */
/* ---------------------------------------------------------------------- */
export const PROJECTS = [
  {
    number: '01',
    title: 'Cross-LMS Gradebook Sync',
    problem: 'A university ran parallel Moodle and Brightspace instances with grades entered twice and drifting out of sync.',
    solution: 'A sync service that reconciles gradebook state on both platforms in near real time and flags conflicts instead of silently overwriting them.',
    architecture: 'Moodle web services + Brightspace Valence API → Lambda reconciliation worker → RDS for canonical state → SES for conflict alerts.',
    technologies: ['Node.js', 'AWS Lambda', 'RDS', 'Moodle API', 'Brightspace Valence API'],
    result: 'Removed duplicate entry for 40+ instructors and cut grade-discrepancy tickets to near zero within a term.',
  },
  {
    number: '02',
    title: 'Support Ticket Triage Agent',
    problem: 'Incoming support requests needed manual reading and routing before anyone could act on them, adding hours of delay.',
    solution: 'An automation agent that classifies, prioritises, and routes tickets using embeddings over historical resolutions, with a human approval step before anything is closed automatically.',
    architecture: 'Webhook intake → embedding + retrieval over a vector store → LLM classification → task queue → notification service.',
    technologies: ['Python', 'Vector store', 'LLM APIs', 'Task queue', 'Webhooks'],
    result: 'Cut first-response time from hours to minutes while keeping a human in the loop on every automated decision.',
  },
  {
    number: '03',
    title: 'District-Wide SSO & Provisioning',
    problem: 'Student and staff accounts were provisioned by hand across a learning platform, email, and a records system — slow, and easy to get wrong.',
    solution: 'A provisioning pipeline that treats the student information system as the source of truth and automates account lifecycle end to end.',
    architecture: 'SIS export → API Gateway → ECS worker → SSO/SAML provider → Moodle & Brightspace provisioning APIs.',
    technologies: ['AWS ECS', 'API Gateway', 'SAML/SSO', 'PostgreSQL', 'Moodle & Brightspace APIs'],
    result: 'Reduced new-account turnaround from days to under an hour, with an audit trail for every change.',
  },
];

/* ---------------------------------------------------------------------- */
/* COPY BLOCKS                                                             */
/* ---------------------------------------------------------------------- */
export const COPY = {
  role: 'Full Stack Developer & AI Engineer',
  roleSub: 'AI Builder',
  heroStatement:
    'I build digital solutions that connect platforms, automate what shouldn\u2019t be manual, and put AI to work inside real systems \u2014 not around them.',
  philosophy:
    'The interesting part of this work is rarely a single feature. It\u2019s the connective tissue: an LMS event that should trigger a database update, a support queue that should route itself, an integration that has to hold up in production, not just in a demo. I design for that layer \u2014 systems that stay maintainable after I\u2019m no longer the one reading the logs.',
  manifesto: [
    'I build systems.',
    'I connect platforms.',
    'I automate processes.',
    'I integrate AI.',
    'I turn complex digital requirements into working solutions.',
  ],
};
