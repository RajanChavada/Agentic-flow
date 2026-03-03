# MCP Tools Guide — Agentic Flow

## Configured MCP Servers (`.cursor/mcp.json`)

| Server | Purpose | Use when |
|--------|---------|----------|
| **exa** | Web & code search | Research on any topic you're implementing |
| **supabase** | Database operations | Query/migrate Supabase (requires auth) |

---

## Exa.ai — Research

**Tool:** `web_search_exa`

Use for research on topics you're implementing (e.g. MLP best practices, UX patterns, framework docs). Returns clean, ready-to-use content from top search results. When findings inform decisions, reference articles in logs and AGENT_MEMORY per `.cursor/rules/log-update.mdc`.

```json
{
  "query": "your research topic",
  "numResults": 8,
  "type": "auto",
  "livecrawl": "fallback"
}
```

**Server ID:** `project-0-Agentic-flow-exa`

---

## Supabase — Database

**Status:** Requires authentication. Cursor will prompt you to log in to Supabase in a browser when first connecting.

**Tools (after auth):** `execute_sql`, `list_tables`, `apply_migration`, `list_migrations`, etc.

**Server ID:** `project-0-Agentic-flow-supabase`

### Fixing 403 Forbidden errors

If you see `{"message":"Forbidden resource"}` or `Non-200 status code (403)`:

1. **Use base URL (no project_ref)** — The config uses `https://mcp.supabase.com/mcp` without `project_ref`. During auth, you select the project. This avoids wrong-project-ref issues.

2. **Re-authenticate** — In Cursor: **Settings → Tools & MCP → Supabase**. Remove and re-add, or click to re-authorize. Complete the browser flow and ensure you click "Open" when redirected back.

3. **PAT workaround (if OAuth fails)** — If the browser auth never completes:
   - Generate a token at https://supabase.com/dashboard/account/tokens
   - Get your project ref from **Supabase Dashboard → Project Settings → General → Reference ID** (20-char string like `xizuzffxeknsbeljaqyk`, NOT a UUID)
   - Update `mcp.json`:
   ```json
   "supabase": {
     "url": "https://mcp.supabase.com/mcp?project_ref=YOUR_PROJECT_REF",
     "headers": {
       "Authorization": "Bearer YOUR_ACCESS_TOKEN"
     }
   }
   ```

4. **Restart Cursor** after config changes.

---

## Ref — Documentation Search

**Tools:** `ref_search_documentation`, `ref_read_url`

Use when working with libraries, frameworks, or APIs to check docs.

**Server ID:** `user-Ref`
