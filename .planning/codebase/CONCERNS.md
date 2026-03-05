# Codebase Concerns

**Analysis Date:** 2026-03-04

## Tech Debt

**Incomplete Newsletter Feature:**
- Issue: Newsletter subscription form has TODO placeholder with no implementation
- Files: `frontend/src/components/ui/footer-section.tsx` (line 31)
- Impact: Users can attempt to subscribe but action does not persist or process
- Fix approach: Either implement the newsletter service integration (email provider API) or remove the newsletter form entirely from footer

**Monolithic Store File:**
- Issue: Workflow store contains 967 lines handling all state management, including API calls, Supabase persistence, scenarios, and UI state
- Files: `frontend/src/store/useWorkflowStore.ts`
- Impact: Single file is error-prone to modify; changes could break multiple feature areas; difficult to test individual concerns
- Fix approach: Split into separate domain stores (persistence, scenarios, UI, API cache) or use a state management middleware pattern

**Large Component Files:**
- Issue: Multiple UI components exceed 1000 lines, mixing logic, rendering, and styling
- Files:
  - `frontend/src/components/EstimatePanel.tsx` (1729 lines)
  - `frontend/src/components/ExportDropdown.tsx` (1006 lines)
- Impact: High cognitive load; difficult to maintain; increased risk of regression when modifying
- Fix approach: Extract sub-components, separate concerns (calculation logic vs rendering), consider feature-driven component hierarchy

**Placeholder Supabase Configuration:**
- Issue: Supabase client falls back to placeholder values if env vars are unset, allowing runtime instantiation without real credentials
- Files: `frontend/src/lib/supabase.ts` (lines 14-26)
- Impact: Errors may surface only at runtime when user attempts to save/load workflows; no clear indication that auth persists locally instead
- Fix approach: Validate credentials at application startup; show explicit configuration error page if Supabase is unconfigured; prevent feature use when unconfigured

**Default Tool Lookups Without Validation:**
- Issue: Estimator falls back to hardcoded defaults for missing tool definitions instead of failing explicitly
- Files: `backend/estimator.py` (lines 170-178, 192)
- Impact: Silent degradation of estimation accuracy; user gets inaccurate cost/latency for tools not in registry
- Fix approach: Log warnings when defaults are used; consider returning estimation error instead allowing estimation to proceed with reduced accuracy

## Testing Gaps

**No Test Framework Installed:**
- Issue: No test files exist; no testing framework (Jest, Vitest, pytest) configured in package.json or backend
- Files: `frontend/package.json`, `backend/requirements.txt`
- Impact: No regression prevention; difficult to identify breaking changes; frontend components untested, backend endpoints untested
- Priority: HIGH
- Fix approach: Install test framework; create at minimum unit tests for store actions, critical utility functions (token counting, cost calculation), and API routes

**Missing Integration Tests:**
- Issue: No tests verify Supabase save/load workflows, OAuth callback flow, or API estimate accuracy
- Impact: Workflow persistence bugs could go undetected; user data loss risk
- Fix approach: Add integration tests for Supabase persistence layer; mock auth flow

**Uncovered API Response Validation:**
- Issue: Frontend fetches provider/tool data from backend but doesn't validate response shape
- Files: `frontend/src/store/useWorkflowStore.ts` (lines 543-575)
- Impact: If backend returns malformed data, frontend crashes silently or displays undefined values
- Fix approach: Add runtime validation (e.g., Zod) for API responses

## Security Considerations

**User ID Handling Without Validation:**
- Issue: User IDs from Supabase auth are directly interpolated into queries without additional verification
- Files: Multiple files using `user.id` in Supabase queries (e.g., `frontend/src/store/useWorkflowStore.ts`)
- Current mitigation: Supabase RLS policies check `auth.uid() = user_id`
- Recommendations: Add explicit user ID validation after auth.getUser(); log suspicious patterns; consider token expiration handling

**Bearer Token Storage:**
- Issue: Supabase session stored in browser cookies without explicit Secure flag verification in code
- Files: `frontend/src/lib/supabase/middleware.ts`
- Current mitigation: Supabase SDK handles cookie management; HTTPS enforced in production
- Recommendations: Document security assumptions; add SameSite cookie headers verification; consider token rotation strategy

**OAuth Callback Without State Parameter Validation:**
- Issue: OAuth callback accepts `code` parameter but doesn't validate PKCE state to prevent CSRF
- Files: `frontend/src/app/auth/callback/route.ts`
- Current mitigation: Supabase SDK handles state internally
- Recommendations: Verify that Supabase SDK validates state automatically; add explicit log trace of auth flow

**Placeholders in Environment Variables:**
- Issue: Code accepts placeholder values for SUPABASE_URL and SUPABASE_KEY which are publicly exposed in frontend build
- Files: `frontend/src/lib/supabase.ts`
- Current mitigation: Config logic flags when unconfigured
- Recommendations: Fail loudly at build time if placeholders are used in production

**API Rate Limiting Missing:**
- Issue: Backend has no rate limiting on estimation endpoints
- Files: `backend/main.py` (lines 54-92)
- Impact: Malicious actor could DOS estimation endpoint through repeated batch requests or large workflow graphs
- Recommendations: Add FastAPI rate limiting middleware; implement per-user quotas via API key; add request size limits

## Performance Bottlenecks

**Graph Analysis Complexity:**
- Issue: Cycle detection uses Tarjan's SCC on potentially large workflow graphs without timeout protection
- Files: `backend/graph_analyzer.py`
- Cause: Exponential time for densely connected node graphs
- Improvement path: Add max-node limit check; implement timeout; cache results for identical graphs

**Token Counting Per-Item:**
- Issue: Estimator calls `tiktoken.encode()` for each text field, which tokenizes repeatedly
- Files: `backend/estimator.py` (line 122)
- Cause: No memoization of token counts for identical inputs
- Improvement path: Cache token counts by hash; batched encoding

**Frontend Store Re-renders:**
- Issue: `useWorkflowStore` is a large monolithic store; any state change triggers all subscribers
- Files: `frontend/src/store/useWorkflowStore.ts`
- Cause: Zustand default behavior without granular subscriptions (though selector hooks are exported)
- Improvement path: Ensure all components use selector hooks; document subscription cost for large workflow graphs

**Estimation Panel Rendering:**
- Issue: EstimatePanel with 1729 lines likely renders large tables/charts without virtualization
- Files: `frontend/src/components/EstimatePanel.tsx`
- Impact: Slow rendering for workflows with 50+ nodes
- Improvement path: Add windowing/virtualization for node breakdown table

## Fragile Areas

**Workflow Import Adapters:**
- Issue: Import adapters accept arbitrary payload and convert to internal format with minimal validation
- Files: `backend/import_adapters.py`
- Why fragile: Adapters fail silently or with vague error messages if payload format differs
- Safe modification: Add strict schema validation; return specific error codes per failure type
- Test coverage: No tests for import adapters

**Edge ID Generation:**
- Issue: Edges without IDs get generated with `uuid()` in multiple places; no collision detection
- Files: `frontend/src/store/useWorkflowStore.ts` (lines 365, 441, 487, etc.)
- Why fragile: If import/copy creates duplicate edge IDs, React Flow rendering may break silently
- Safe modification: Use a centralized edge ID generator with collision detection

**Model Pricing Registry Lookups:**
- Issue: Registry lookups return None if model not found; estimator falls back to defaults
- Files: `backend/pricing_registry.py` lookups in `backend/estimator.py`
- Why fragile: Silently degrades accuracy for new/renamed models
- Safe modification: Return explicit error; require explicit model configuration registration

**Supabase Query Error Handling:**
- Issue: Many Supabase calls check `if (error)` but don't distinguish between auth errors, network errors, and data errors
- Files: Multiple files (e.g., `frontend/src/store/useWorkflowStore.ts` lines 684-699)
- Why fragile: Network timeouts and permission errors treated identically; user sees generic "error" message
- Safe modification: Categorize error types; retry network errors; log permission errors

## Scaling Limits

**Workflow Graph Node Limit:**
- Current capacity: No explicit limit; frontend renders all nodes at once
- Limit: Estimated 100+ nodes before React Flow performance degrades; Zustand selector impact
- Scaling path: Implement node virtualization; paginate large workflows; add explicit performance warnings at 50+ nodes

**Batch Estimation Load:**
- Current capacity: Endpoints accept BatchEstimateRequest without payload size validation
- Limit: 100+ workflows × 100+ nodes each could exhaust Python memory or timeout
- Scaling path: Add request size limits; implement streaming response; move to background job queue

**Database Query Performance:**
- Current capacity: `loadWorkflowsFromSupabase` loads all workflows for user without pagination
- Limit: User with 1000+ workflows gets slow load; no offset/limit query parameters
- Scaling path: Add pagination; implement cursor-based pagination; add search filtering

## Dependencies at Risk

**Tiktoken Token Counting:**
- Risk: Tiktoken model updates could change token counts; no version pinning in backend
- Impact: Cost estimates become stale; users plan infrastructure based on outdated numbers
- Migration plan: Pin tiktoken version; document token counting strategy; implement token count versioning in estimations

**Zustand Store Evolution:**
- Risk: Large monolithic store makes migration to Redux/MobX expensive later
- Impact: Refactoring blocked if store becomes bottleneck
- Migration plan: Keep selector hooks; avoid direct store access; consider domain-driven store split

**Next.js 16 & React 19:**
- Risk: Early-stage React 19 features (memo compiler, use hook) may have edge cases
- Impact: Unexpected re-renders or hook behavior
- Recommendation: Monitor React 19 release notes; add component-level performance tracking

## Missing Critical Features

**Production Error Tracking:**
- Issue: No error tracking service (Sentry, Datadog, LogRocket) integrated
- Impact: Production bugs reported only via user reports; no visibility into error patterns
- Recommendation: Implement error tracking middleware; log API errors server-side

**Metrics & Observability:**
- Issue: No metrics for estimation accuracy vs. actual costs; no telemetry on feature usage
- Impact: Can't measure if estimation correlates with real costs; can't track which features are used
- Recommendation: Add cost vs. estimate tracking; log feature usage events

**Audit Trail for Workflows:**
- Issue: Workflow changes not logged; no history of modifications
- Impact: Can't track who changed what; data integrity issues if accidental deletes occur
- Recommendation: Add audit timestamps; implement soft delete; log user actions

## Test Coverage Gaps

**Untested Areas with High Risk:**

**Estimation Accuracy:**
- Files: `backend/estimator.py`
- What's not tested: Token counting for various model families; cycle detection in complex graphs; scaling calculations
- Risk: Wrong cost/latency estimates go unnoticed; business decisions based on incorrect data
- Priority: HIGH

**Supabase Persistence Layer:**
- Files: `frontend/src/store/useWorkflowStore.ts` (persistence methods starting line 645)
- What's not tested: Concurrent saves; save during network outage; stale session recovery
- Risk: Data loss or corruption; workflows overwritten unintentionally
- Priority: HIGH

**OAuth/Authentication Flow:**
- Files: `frontend/src/app/auth/callback/route.ts`, `frontend/src/store/useAuthStore.ts`
- What's not tested: Token refresh; sign-out cache invalidation; multi-tab auth sync
- Risk: User session inconsistencies; auth tokens expire silently
- Priority: MEDIUM

**Workflow Import & Export:**
- Files: `frontend/src/components/ImportWorkflowModal.tsx`, `frontend/src/components/ExportDropdown.tsx`
- What's not tested: Malformed JSON import; circular edge detection; schema version mismatches
- Risk: Import crashes frontend; export generates invalid files
- Priority: MEDIUM

**Graph Cycle Detection:**
- Files: `backend/graph_analyzer.py`
- What's not tested: SCC algorithm with self-loops; pathological graph shapes; performance with 1000+ nodes
- Risk: Silent failures in cycle detection; incorrect estimation for cyclic workflows
- Priority: MEDIUM

---

*Concerns audit: 2026-03-04*
