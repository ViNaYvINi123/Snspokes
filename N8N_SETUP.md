# snspokes v12 — n8n Workflow Setup Guide

## All AI now runs through n8n → OpenRouter (free models)

### Architecture
```
User Request
    ↓
Next.js API Route
    ↓
n8n Webhook (primary)     ← OpenRouter free model
    ↓ (if n8n fails)
Direct OpenRouter/Ollama  ← fallback
```

## Import All Workflows

1. Open n8n at http://77.42.71.149:5678
2. Go to Workflows → Import
3. Import each JSON file in order:

| File | Webhook Path | Purpose |
|------|-------------|---------|
| workflow1_search.json | sn-search-spokes | Spoke search |
| workflow4_chatbot.json | sn-chatbot | ← REPLACED by workflow13 |
| workflow5_spoke_enricher.json | sn-enrich-spoke | AI spoke generation |
| workflow6_error_processor.json | (scheduled) | Auto-process errors |
| workflow7_query_optimizer.json | sn-optimize-query | Query optimization |
| workflow8_self_healing.json | (scheduled) | Error spike alerts |
| workflow9_code_generator.json | sn-generate-code | ✨ AI Code Generator |
| workflow10_script_linter.json | sn-lint-script | ✨ Script Linter |
| workflow11_error_analyzer.json | sn-analyze-error | ✨ Error Analysis |
| workflow12_ai_debug.json | sn-ai-debug | ✨ AI Debug |
| workflow13_chatbot.json | sn-chatbot | ✨ Chatbot (OpenRouter) |

## Required n8n Credentials

### 1. Postgres Credential
- Name: `Postgres snspokes`
- Host: `snspokes_db`
- Port: `5432`
- Database: `snspokes`
- User: `snspokes_user`
- Password: `Vinay@123`

### 2. Environment Variables in n8n
Go to Settings → Environment Variables → Add:
```
OPENROUTER_API_KEY = sk-or-v1-your-key-here
```

## OpenRouter Free Models Used
- `meta-llama/llama-3.1-8b-instruct:free` — fast, good quality
- Alternative: `mistralai/mistral-7b-instruct:free`
- Alternative: `google/gemma-2-9b-it:free`

## How Fallback Works
Every API endpoint tries n8n first:
1. Calls n8n webhook with 90s timeout
2. If n8n returns success → use that result
3. If n8n fails/timeout → fallback to direct OpenRouter or Ollama
4. Response includes `via: "n8n"` or `via: "direct"` so you know which path was used

## Check which path is being used
```bash
# Test chatbot
curl -X POST http://localhost:3001/api/chatbot \
  -H "Content-Type: application/json" \
  -d '{"question":"what is GlideRecord?"}'

# Response will include: "via":"n8n" or "via":"direct"
```

## Monitoring
- View all n8n executions: http://77.42.71.149:5678/executions
- Each execution shows: input, output, timing, errors
- n8n auto-retries on failure
