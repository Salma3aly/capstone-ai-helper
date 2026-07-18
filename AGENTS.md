<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:anchored-summary -->
## Goal
Build out core app features and prepare the community hub for production deployment by migrating off file-based storage and raw WebSocket.

## Constraints & Preferences
- "Lipo" is the AI assistant name, "Capstone" is the site name.
- Community hub must use JWT-authenticated user data, not user-supplied names/emails from request body.
- File-based storage (`data/hub_messages.json`) and raw WebSocket (port 3002) won't work on Vercel — replaced with MongoDB Atlas + Pusher.
- Citations generated on-demand via "Cite" button, not auto-generated.
- All APA/MLA/IEEE/AMA citations must use year-only dates, full journal names, all co-authors, volume/issue/article-number, and clickable DOI.
- Citation form state must survive sidebar tab navigation (localStorage).
- Publication date input accepts flexible year strings (`type="text"` not `type="date"`).
- Clear all form fields before populating new autofill/PDF data to prevent stale state pollution.
- Crossref-first pipeline order: try DOI/title lookup before LLM, use verified data as baseline.
- CRAN/software citations suppress all journal metadata (volume, issue, pages, DOI) when no authors present.
- Architecture diagram colors: pink `#ec4899` (page), purple `#a855f7` (service), violet `#8b5cf6` (database), blue `#3b82f6` (external).
- Multiple Groq API keys from different organizations rotate round-robin; exhausted keys (TPD) are skipped and cleared hourly.
- Sandbox Code step detects hardware projects (board+sensors) and generates Arduino code, not React/Next.js.
- AAAI/OJS sites block automated HTML fetch; Crossref title search returns wrong articles; OJS OAI-PMH provides reliable structured metadata.

## Pipeline Order (scrape route)
1. Fetch HTML → if blocked, try PDF fallback → if still blocked, try OJS OAI-PMH
2. Extract meta tags from HTML (if any)
3. Crossref DOI lookup (exact DOI from OAI/meta) → if 404, try Crossref title search
4. Baseline: OAI-PMH data first (most reliable when page blocked) → then Crossref data (validated: Crossref DOI prefix must match host publisher prefix) → meta fills gaps
5. LLM fills remaining gaps from HTML text (if available) or URL context (only if essential data still missing — fills gaps, never overrides OAI/Crossref data)

## Progress
### Done
- Renamed AI assistant from "AI Mentor" to "Lipo" everywhere; redesigned logo; added greeting popup.
- Exported SVG + PNG logo assets to `public/` with multiple variants; enlarged logo sizes.
- Rewrote Community Hub page with white/pink theme and JWT-based messaging.
- Cleaned `data/hub_messages.json`: removed all test/seed messages.
- Updated WebSocket server with presence tracking and deduplication by email.
- Added X close button to hub right sidebar.
- Expanded `lib/examples/data.ts` with full pre-built projects; created `app/(dashboard)/examples/[id]/page.tsx`.
- Converted all wiring data to grouped `connections` format.
- Configured favicon with SVG + PNG + apple-touch-icon.
- Installed HeroCarousel with 4 stock photos, auto-rotation, dot navigation.
- Citation tool: Cite button works with title-only or URL; PDF file name persists; accessDate removed; volume/issue/pages/DOI fields added.
- Architecture Diagram: fixed 3-pipeline reference brand-colored SVG, fullscreen modal overlay.
- Sandbox code area simplified to single dark pre/code block.
- Settings page created at `app/(dashboard)/settings/page.tsx`; profile update API.
- GitHub repo pushed to public at `https://github.com/Salma3aly/capstone-ai-helper`.
- Sandbox API routes no longer require authentication (userId defaults to "anonymous").
- Hardware wiring auto-recommendation and auto-recalculate with 800ms debounce.
- Scrape route: robust logging, `buildSearchQueryFromUrl` with article ID numbers, PDF fallback for OJS URLs, LLM fallback with `urlDerivedTitle`.
- Citation date input changed from `type="date"` to `type="text"`.
- `lib/citation/styles.ts`: comprehensive APA/MLA/IEEE/AMA fixes.
- `lib/citation/metadataFetcher.ts`: `extractSoftwareAuthors()` handles multiple formats.
- CRAN DESCRIPTION file fetch for reliable author/year.
- State pollution fix: both `autoFillMetadata` and `handlePdfUpload` clear all fields first.
- PDF upload X button to clear file name/status.
- `lib/sandbox/grok.ts`: multi-key round-robin rotation with 429 TPD handling.
- `lib/sandbox/xai.ts`: delegates to grok.ts when no `XAI_API_KEY`.
- Code step routes to Arduino generator when hardware selected.
- Save button syncs to both sandbox store and My Projects (localStorage + API).
- My Projects link fixed from `?project=` to `/[id]`.
- Citation tool: reset button in Source Details header.
- Community hub: generalized rules, configurable WS URL, MongoDB + Pusher migration.
- `.env.example` created with all required env vars.
- **OJS OAI-PMH fallback**: `fetchOjsOaiMetadata()` extracts title/authors/date/DOI/volume/issue/pages/journal from OJS OAI-PMH endpoint when HTML is blocked. Fixes Crossref title search returning wrong articles for AAAI journals where DOI isn't registered with Crossref (404).
- **Crossref DOI prefix validation**: checks `crossrefData.doi` prefix against host publisher prefix (not existing DOI), rejecting wrong-article results from title search (e.g., AAAI article → SSRN article via shared word match).
- **Step 5b gap-fill only**: LLM fallback no longer overrides existing OAI/Crossref data — only fills genuinely missing essential fields.

### In Progress
- (none)

### Blocked
- Auth system (`lib/auth/db.ts`) still uses file-based `data/users.json` — same Vercel read-only fs blocker. Registration will fail silently on deploy.
- Prompt-level rules don't reliably fix LLM-generated code — model ignores rules and outputs broken React apps.

## Key Decisions
- Hub POST API uses JWT from Authorization header for user identity.
- WebSocket presence deduplicates by email (falls back to name).
- Example projects use grouped `connections` format.
- Citation generation is manual (click "Cite") rather than automatic.
- Access date removed from all citation types and styles.
- Architecture Diagram uses fixed 3-pipeline reference architecture with brand colors.
- Sandbox API routes no longer require auth.
- Hardware wiring section is always visible; auto-recommendation uses full project context.
- Scrape API always calls LLM even when meta tags return partial data.
- Publication date input is `type="text"`.
- All citation styles use year-only dates by default.
- Citation state restored via client-side `useEffect` (not SSR `useState`).
- Crossref-first pipeline: DOI/title lookup before LLM.
- Multiple Groq API keys rotate round-robin.
- GitHub repo is public.
- Code step routes to Arduino generator when hardware selected.
- Save syncs to both sandbox store and legacy My Projects.
- Community hub uses MongoDB + Pusher.

## Next Steps
1. ~~Swap file-based storage for a real database~~ Done.
2. Migrate auth system (`lib/auth/db.ts`) from `data/users.json` to MongoDB.
3. Fix generated code at architecture level to ensure proper backend/API layer.

## Critical Context
- `data/hub_messages.json` is no longer used.
- WebSocket server on port 3002 is deprecated.
- Dev server must be restarted after `.env.local` changes; use `Start-Process` for background server.
- Build command: `npx next build`.
- `cleanString`/`cleanAuthors` helpers strip N/A/none/unknown/null/undefined.
- Pipeline centers in architecture SVG: [210, 520, 830]; databases aligned with 174px gaps.
- OJS OAI-PMH URL: `{protocol}//{host}/{basePath}/index.php/{journalName}/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:ojs.aaai.org:article/{id}`.
- Crossref DOI prefix validation checks `crossrefData.doi` (after stripping `https://doi.org/`) against `PUBLISHER_DOI_PREFIXES` — rejects wrong-article matches from title search.
- Step 5b fires only when `(authors.length === 0 || !pubDate || !title || !siteName)` AND no HTML available — fills gaps only, never overrides existing data.

## Relevant Files
- `app/api/citation/scrape/route.ts`: OAI-PMH fallback, Crossref prefix validation, pipeline orchestration.
- `lib/sandbox/grok.ts`: Groq client with multi-key rotation, 429 TPD handling.
- `lib/sandbox/xai.ts`: xAI client → delegates to grok.ts when unset.
- `lib/citation/styles.ts`: APA/MLA/IEEE/AMA citation formatters.
- `lib/citation/metadataFetcher.ts`: author extraction from Crossref, DataCite, CRAN.
- `lib/db/connect.ts`, `lib/db/models/HubMessage.ts`, `lib/db/models/HubChannel.ts`: MongoDB + Mongoose.
- `lib/pusher/server.ts`: Pusher server instance.
- `lib/auth/db.ts`: still file-based — needs MongoDB migration.
- `.env.example`: all required env vars documented.
<!-- END:anchored-summary -->
