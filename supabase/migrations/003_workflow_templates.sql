-- Supabase migration: workflow_templates table for marketplace
-- Run in Supabase SQL Editor (Dashboard > SQL > New Query)

-- ================================================================
-- 1. WORKFLOW_TEMPLATES TABLE
-- ================================================================

create table if not exists public.workflow_templates (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete set null,
  name         text not null,
  description  text,
  graph        jsonb not null,
  category     text not null default 'custom',
  is_curated   boolean not null default false,
  use_count    int default 0,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create trigger workflow_templates_updated_at
  before update on public.workflow_templates
  for each row execute function public.set_updated_at();

-- ================================================================
-- 2. ENABLE RLS
-- ================================================================

alter table public.workflow_templates enable row level security;

-- ================================================================
-- 3. RLS POLICIES
-- ================================================================

-- Anyone can browse (anon + authenticated)
create policy "templates_select_all"
  on public.workflow_templates for select
  using (true);

-- Only authenticated users can publish
create policy "templates_insert_authenticated"
  on public.workflow_templates for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Only owner can update (and not curated)
create policy "templates_update_own"
  on public.workflow_templates for update
  to authenticated
  using (auth.uid() = user_id and is_curated = false);

-- Only owner can delete (and not curated)
create policy "templates_delete_own"
  on public.workflow_templates for delete
  to authenticated
  using (auth.uid() = user_id and is_curated = false);

-- ================================================================
-- 4. INDEXES
-- ================================================================

create index if not exists workflow_templates_category_idx on public.workflow_templates(category);
create index if not exists workflow_templates_use_count_idx on public.workflow_templates(use_count desc);
create index if not exists workflow_templates_created_idx on public.workflow_templates(created_at desc);

-- ================================================================
-- 5. SEED CURATED TEMPLATES
-- ================================================================

insert into public.workflow_templates (name, description, graph, category, is_curated, user_id)
values
  (
    'Simple RAG',
    'A minimal RAG workflow: Start, RAG agent, Finish. Ideal for document Q&A.',
    '{"nodes":[{"id":"start-1","type":"startNode","label":"Start"},{"id":"agent-1","type":"agentNode","label":"RAG Agent","model_provider":"Anthropic","model_name":"Claude-3.5-Sonnet","context":"Answer questions using the provided context.","task_type":"rag_answer","expected_output_size":"medium"},{"id":"finish-1","type":"finishNode","label":"Finish"}],"edges":[{"source":"start-1","target":"agent-1"},{"source":"agent-1","target":"finish-1"}],"recursionLimit":25}'::jsonb,
    'rag',
    true,
    null
  ),
  (
    'Research Loop',
    'Cyclic research workflow: Agent calls search tool, reviews results, may loop for refinement.',
    '{"nodes":[{"id":"start-1","type":"startNode","label":"Start"},{"id":"agent-1","type":"agentNode","label":"Researcher","model_provider":"OpenAI","model_name":"GPT-4o","context":"Research the topic thoroughly.","task_type":"tool_orchestration","expected_output_size":"long","max_steps":5},{"id":"tool-1","type":"toolNode","label":"Search","tool_id":"mcp_web_search"},{"id":"agent-2","type":"agentNode","label":"Synthesizer","model_provider":"Anthropic","model_name":"Claude-3.5-Sonnet","context":"Synthesize findings into a report.","task_type":"summarization","expected_output_size":"long"},{"id":"finish-1","type":"finishNode","label":"Finish"}],"edges":[{"source":"start-1","target":"agent-1"},{"source":"agent-1","target":"tool-1"},{"source":"tool-1","target":"agent-2"},{"source":"agent-2","target":"agent-1"},{"source":"agent-2","target":"finish-1"}],"recursionLimit":25}'::jsonb,
    'research',
    true,
    null
  ),
  (
    'Tool Orchestrator',
    'Agent orchestrates multiple tools: database query and API call, then aggregates results.',
    '{"nodes":[{"id":"start-1","type":"startNode","label":"Start"},{"id":"agent-1","type":"agentNode","label":"Orchestrator","model_provider":"OpenAI","model_name":"GPT-4o","context":"Coordinate tool calls and aggregate results.","task_type":"tool_orchestration","expected_output_size":"medium","expected_calls_per_run":3},{"id":"tool-1","type":"toolNode","label":"Database","tool_id":"postgres"},{"id":"tool-2","type":"toolNode","label":"API","tool_id":"mcp_web_search"},{"id":"agent-2","type":"agentNode","label":"Aggregator","model_provider":"Anthropic","model_name":"Claude-3.5-Sonnet","context":"Combine tool outputs into a final response.","task_type":"summarization","expected_output_size":"medium"},{"id":"finish-1","type":"finishNode","label":"Finish"}],"edges":[{"source":"start-1","target":"agent-1"},{"source":"agent-1","target":"tool-1"},{"source":"agent-1","target":"tool-2"},{"source":"tool-1","target":"agent-2"},{"source":"tool-2","target":"agent-2"},{"source":"agent-2","target":"finish-1"}],"recursionLimit":25}'::jsonb,
    'orchestration',
    true,
    null
  ),
  (
    'Classification Pipeline',
    'Simple classification: single agent node for label/decision output.',
    '{"nodes":[{"id":"start-1","type":"startNode","label":"Start"},{"id":"agent-1","type":"agentNode","label":"Classifier","model_provider":"OpenAI","model_name":"GPT-4o-mini","context":"Classify the input into one of the predefined categories.","task_type":"classification","expected_output_size":"short"},{"id":"finish-1","type":"finishNode","label":"Finish"}],"edges":[{"source":"start-1","target":"agent-1"},{"source":"agent-1","target":"finish-1"}],"recursionLimit":25}'::jsonb,
    'custom',
    true,
    null
  );
