# n8n Workflow Setup

## Quick Setup

1. Open n8n: `https://n8n.snspokes.com`
2. Go to **Workflows** → **Import from File**
3. Import these 6 files (one at a time):
   - `n8n_workflow_search.json` — Search spokes (DB)
   - `n8n_workflow_chatbot.json` — AI Chatbot (OpenRouter)
   - `n8n_workflow_spoke_enricher.json` — Generate spoke content (OpenRouter)
   - `n8n_workflow_tools.json` — Code gen, linter, error analyzer, query optimizer (OpenRouter)
   - `n8n_workflow_ai_debug.json` — Admin AI debug (OpenRouter)
   - `n8n_workflow_list_spokes.json` — List all spokes (DB)
   - `n8n_workflow_property_assist.json` — AI property suggestions (OpenRouter)
4. For DB workflows: Set up Postgres credentials:
   - Host: `snspokes_db`
   - Database: `snspokes`
   - User: `snspokes_user`
   - Password: (from your .env.local)
5. **Activate ALL workflows** (toggle ON in top right of each)

## OpenRouter API Key

The OpenRouter API key is passed to n8n via the `OPENROUTER_API_KEY` environment variable in docker-compose.yml.

Set it in your `.env.local`:
```
OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

Get a free key at: https://openrouter.ai/keys

Free models used:
- `openrouter/free` (default)

## Webhook Paths

| Path | Workflow | Purpose |
|------|----------|---------|
| `sn-search-spokes` | Search | DB text search |
| `sn-chatbot` | Chatbot | AI answers |
| `sn-enrich-spoke` | Spoke Enricher | Generate spoke docs |
| `sn-generate-code` | AI Tools | Code generation |
| `sn-lint-script` | AI Tools | Script review |
| `sn-analyze-error` | AI Tools | Error analysis |
| `sn-optimize-query` | AI Tools | Query optimization |
| `sn-ai-debug` | AI Debug | Admin debugging |
| `sn-list-spokes` | List Spokes | Get all spokes |
| `sn-property-assist` | Property Assist | AI property suggestions |
