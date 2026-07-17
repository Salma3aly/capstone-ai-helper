// ─── Hardware prompts (existing) ──────────────────────────────────────────

export function buildGeneratePrompt(
  idea: string,
  board: string,
  sensors: string[],
  language: string
): string {
  return `You are an embedded systems tutor helping someone build their project.
  
Student's idea: "${idea}"
Selected components: ${[board, ...sensors].join(", ")}
Target language: ${language}

Generate complete, working starter code for this project.

Rules:
- Include ALL necessary library imports / #include statements
- Define all pin constants at the top with descriptive comments
- Implement logic directly related to the student's idea — not generic boilerplate
- Add inline comments on every meaningful line explaining what it does
- Make the code copy-paste ready with no placeholders

WIRING DIAGRAM REQUIREMENTS:
1. You MUST generate a wiring entry in the "wiring" array for EVERY single selected sensor/component: ${sensors.join(", ")}. Do not skip any of them.
2. In each entry, the "component" field MUST exactly match the name of the sensor as listed above (e.g., use exactly "${sensors[0]}" or "${sensors[1] || ""}"). Do not add, omit, or modify any words in the name.
3. Detail all connections between the sensor pins (e.g. VCC, GND, data/signal pins) and the microcontroller board's pins (e.g. "VCC → 5V", "GND → GND", "AO → A0").

DATA LOGGING REQUIREMENTS (always include):
1. Read each sensor at a configurable interval (default 1000ms)
2. Timestamp each reading using millis() (or RTC if available)
3. Output data to Serial in CSV format: timestamp_ms,sensor1,sensor2,...
4. Add a comment block at the top explaining how to capture Serial output to a .csv file:
   - Arduino: "Tools > Serial Monitor > copy/paste or use Serial Plotter"
   - Include a comment with a Python pyserial script snippet for logging

ACTUATOR SAFETY CHECK — mandatory before returning:
1. Identify if any selected component is an actuator (motor, pump, solenoid valve, relay-driven load, etc.).
2. For each such actuator, determine its typical current draw. If it could exceed the microcontroller's per-pin/output limit (~20-40mA for most boards):
   - Insert a suitable driver stage (relay module, MOSFET, or transistor + flyback diode for inductive loads) between the microcontroller pin and the actuator.
   - Reflect the driver component in the wiring entry (e.g. "Motor Driver Module IN → Pin 9" and "Motor Driver Module OUT → Pump +", not "Pump IN → Pin 9").
   - List the driver as if it were a separate component with its own connections, even if the user did not explicitly select it.
3. If a low-current actuator is used that is within the pin's safe limit (e.g. a 5V mini pump connected via a driver-equipped module), state the estimated current draw and confirm safety in a comment instead of omitting the check.

Return ONLY raw JSON. No markdown, no backticks, no explanation.

Format:
{
  "wiring": [
    {
      "component": "Component Name",
      "connections": ["VCC → 5V", "GND → GND", "Trig → Pin 9"]
    }
  ],
  "code": "The complete source code as a single string with \\n line breaks."
}`;
}

// ─── Software project pipeline prompts ──────────────────────────────────

export function buildAnalyzePrompt(idea: string): string {
  return `You are a senior software architect analyzing a project idea. Analyze the following idea and return a structured JSON analysis.

Idea: "${idea}"

Return ONLY raw JSON. No markdown, no backticks, no explanation.

Format:
{
  "title": "Short project title",
  "problem_statement": "What problem does this solve?",
  "target_user": "Who is this for?",
  "core_features": ["feature 1", "feature 2", "feature 3"],
  "out_of_scope": ["what to avoid", "future enhancements"],
  "clarifying_questions": ["question 1", "question 2"]
}`;
}

export function buildComponentsPrompt(idea: string, analysis: string): string {
  return `You are a senior software architect designing a project. Based on the idea and analysis below, recommend the components needed.

Idea: "${idea}"

Analysis:
${analysis}

Hard rules for the \`suggested_stack\` field — do not violate these:

1. Each of \`frontend\`, \`backend\`, \`database\` must be a single concrete technology. Never blank, never \`"—"\`, never \`null\`, and never a slash-separated list of options (e.g. \`"MySQL / PostgreSQL"\` is invalid — pick one).

2. Pick the single best fit given the project type. If the project has no real backend need, still name a concrete minimal choice (e.g. \`"Node.js / Express"\` or \`"None (client-only)"\` if truly none is needed) — never leave the field empty.

3. Whatever you return in \`suggested_stack\` here is what the Code step will implement verbatim. Do not suggest one database and let a later step substitute another.

4. Self-check before returning:
   - Is \`frontend\` a single named technology (not blank, not a list)?
   - Is \`backend\` a single named technology (not blank, not a list)?
   - Is \`database\` a single named technology (not blank, not a list)?
   If any check fails, pick one and fix it before returning.

Return ONLY raw JSON. No markdown, no backticks, no explanation.

Format:
{
  "pages": [
    { "name": "Dashboard", "purpose": "Main user interface" }
  ],
  "data_models": [
    { "name": "User", "fields": ["id", "name", "email"] }
  ],
  "integrations": [
    { "name": "Stripe", "why": "Payment processing" }
  ],
  "suggested_stack": {
    "frontend": "React / Next.js",
    "backend": "Node.js / Express",
    "database": "PostgreSQL"
  }
}`;
}

export function buildWiringPrompt(idea: string, components: string): string {
  return `You are a senior software architect designing the data flow and architecture for a project. Based on the idea and components below, design a wiring diagram showing how data flows.

Idea: "${idea}"

Components:
${components}

Hard rules:

1. Every node in your "nodes" array must appear somewhere in the rendered diagram. The diagram is built directly from these nodes — do not use generic/placeholder labels like "Data Ingestion", "Filter Engine", "Filter DB", "Output Generator", "Data Source DB", or "User DB" unless those are literally the names of components from the project context above. Instead, derive each node's label from the actual pages, data models, services, and integrations in the Components section above.

2. Consistency check before returning: every node id referenced in "edges" (in the "from" or "to" fields) must exist in the "nodes" array. If you find a mismatch, repair it before returning rather than sending broken JSON.

Return ONLY raw JSON as a wiring diagram. No markdown, no backticks, no explanation.

Format:
{
  "nodes": [
    { "id": "page_dashboard", "label": "Dashboard", "type": "page" },
    { "id": "svc_auth", "label": "Auth Service", "type": "service" },
    { "id": "db_users", "label": "Users DB", "type": "database" },
    { "id": "ext_stripe", "label": "Stripe API", "type": "external" }
  ],
  "edges": [
    { "from": "page_dashboard", "to": "svc_auth", "label": "login request" },
    { "from": "svc_auth", "to": "db_users", "label": "query" },
    { "from": "page_dashboard", "to": "ext_stripe", "label": "payment" }
  ]
}`;
}

export function buildCodePrompt(
  idea: string,
  analysis: string,
  components: string,
  wiring: string
): string {
  return `You are a senior full-stack developer generating a complete project scaffold. You will receive the full project context as JSON below. You must generate code that is 100% consistent with that context — never substitute your own defaults.

Full project context:
${JSON.stringify({ idea, analysis: JSON.parse(analysis), components: JSON.parse(components), wiring: JSON.parse(wiring) }, null, 2)}

Hard rules — do not violate these:

1. Build tool must match the framework. If frontend is "React / Next.js" or anything Next.js-related:
   - package.json MUST include "next" as a dependency and use "next dev"/"next build" as scripts
   - Do NOT use "react-scripts" (Create React App) — CRA doesn't support app/ directory or layout.tsx
   - Include next.config.js (or .mjs or .ts)
   - Use App Router convention (app/ directory with page.tsx, layout.tsx)

2. Never import native HTML elements. <html>, <body>, <head>, <meta>, <link> are native JSX elements — do not import them from any package. Never write "import { HTML } from 'html'" or anything similar.

3. Backend/API layer is REQUIRED when the stack specifies a backend. Do not skip it:
   - Generate API route files under app/api/.../route.ts that handle all database operations
   - lib/db.ts or equivalent database module is for SERVER-SIDE ONLY — never import it in a 'use client' component
   - Client components ('use client') must fetch data from /api/* endpoints using fetch() — never import mysql2, pg, prisma, or any server-only package
   - If the stack says "Node.js / Express" for backend, generate Express-like API routes that run server-side and expose REST endpoints the client calls
   - The client sends HTTP requests to /api/...; the server routes handle DB queries and return JSON responses

4. README must appear EXACTLY ONCE. It must be in the "readme" field of the JSON output AND as one file entry files[]. Do not duplicate: the "readme" field and the file entry for README.md should have identical content, but there must be exactly one README.md entry in the files array and one "readme" field — no second copy of the content appended anywhere.

5. Every data model must be implemented. For each entry in components.data_models, generate a real table/schema with every field listed (including timestamps, foreign keys, etc.) and at least one function to create/read it. Do not drop, merge, or simplify models — if data_models has 3 models, the generated code must have 3 corresponding tables/schemas.

6. No duplicate top-level resources. Database/client connections must be initialized once in a single shared server-only module (e.g. lib/db.ts) and imported only by server-side files (API routes, server components). Never open a second independent connection in another file.

7. No top-level await unless the target Node/TS config supports it. If you use it, also emit the required tsconfig.json / package.json "type" settings needed to make it valid. Otherwise wrap initialization in an async init() function called explicitly.

Self-check before returning — verify EVERY item:
- [ ] Does package.json use "next" (not "react-scripts") when frontend is Next.js?
- [ ] Does any file contain "import { HTML }" or similar impossible imports?
- [ ] Is every 'use client' file free of server-only imports (mysql2, pg, prisma, fs, etc.)?
- [ ] Are the database credentials only in server-side files, never in client components?
- [ ] If the stack has a backend, are there API route files (app/api/*/route.ts) that sit between the client and the database?
- [ ] Does every model in data_models appear as a table/schema?
- [ ] Does the database dependency in package.json match components.stack.database?
- [ ] Does the README content appear exactly once across the entire output?
- [ ] Would npm install && npm run dev actually start without a build error?
If any check fails, fix it before returning.

Return ONLY raw JSON. No markdown, no backticks, no explanation.

Format:
{
  "files": [
    { "path": "package.json", "content": "..." },
    { "path": "next.config.js", "content": "..." },
    { "path": "app/layout.tsx", "content": "..." },
    { "path": "app/page.tsx", "content": "..." },
    { "path": "app/api/.../route.ts", "content": "..." },
    { "path": "lib/db.ts", "content": "..." },
    { "path": "README.md", "content": "..." }
  ],
  "readme": "Full README content (identical to the README.md file entry)"
}`;
}
