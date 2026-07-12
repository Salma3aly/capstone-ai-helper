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

export function buildCodePrompt(idea: string, wiring: string): string {
  return `You are a senior full-stack developer generating a complete project scaffold. Based on the idea and architecture below, generate all the files for a working project.

Idea: "${idea}"

Architecture:
${wiring}

Rules:
- Generate REAL, working code — not templates or placeholders
- Include proper imports, error handling, and basic styling
- Use Next.js App Router (React) for frontend pages
- Use simple file-based storage or SQLite for backend (no external DB setup needed)
- Include a README with setup and run instructions
- Every file must be complete and functional

Return ONLY raw JSON. No markdown, no backticks, no explanation.

Format:
{
  "files": [
    { "path": "package.json", "content": "..." },
    { "path": "app/page.tsx", "content": "..." },
    { "path": "app/layout.tsx", "content": "..." },
    { "path": "lib/store.ts", "content": "..." },
    { "path": "README.md", "content": "..." }
  ],
  "readme": "Full README content"
}`;
}
