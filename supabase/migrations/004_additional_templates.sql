-- Supabase migration: additional curated workflow templates
-- Expands marketplace from 4 to 8 curated templates
-- Run in Supabase SQL Editor (Dashboard > SQL > New Query)

insert into public.workflow_templates (name, description, graph, category, is_curated, user_id)
values
  (
    'Customer Support Triage',
    'Route support tickets to specialists: triage agent classifies the request, retrieves from knowledge base, then delegates to a specialist.',
    '{"nodes":[{"id":"start-1","type":"startNode","label":"Start"},{"id":"agent-1","type":"agentNode","label":"Triage Agent","model_provider":"OpenAI","model_name":"GPT-4o-mini","context":"Classify the incoming support ticket into billing, technical, or general categories.","task_type":"classification","expected_output_size":"short"},{"id":"tool-1","type":"toolNode","label":"Knowledge Base","tool_id":"postgres"},{"id":"agent-2","type":"agentNode","label":"Specialist","model_provider":"Anthropic","model_name":"Claude-3.5-Sonnet","context":"Provide a detailed resolution based on the ticket category and knowledge base results.","task_type":"rag_answer","expected_output_size":"medium"},{"id":"finish-1","type":"finishNode","label":"Finish"}],"edges":[{"source":"start-1","target":"agent-1"},{"source":"agent-1","target":"tool-1"},{"source":"tool-1","target":"agent-2"},{"source":"agent-2","target":"finish-1"}],"recursionLimit":25}'::jsonb,
    'orchestration',
    true,
    null
  ),
  (
    'Content Writer',
    'Generate and refine content with a review loop: writer drafts content, reviewer provides feedback, writer revises until approved.',
    '{"nodes":[{"id":"start-1","type":"startNode","label":"Start"},{"id":"agent-1","type":"agentNode","label":"Writer","model_provider":"Anthropic","model_name":"Claude-3.5-Sonnet","context":"Write high-quality content based on the given brief.","task_type":"generation","expected_output_size":"long","max_steps":3},{"id":"agent-2","type":"agentNode","label":"Reviewer","model_provider":"OpenAI","model_name":"GPT-4o","context":"Review the draft for clarity, accuracy, and tone. Provide actionable feedback or approve.","task_type":"summarization","expected_output_size":"medium"},{"id":"finish-1","type":"finishNode","label":"Finish"}],"edges":[{"source":"start-1","target":"agent-1"},{"source":"agent-1","target":"agent-2"},{"source":"agent-2","target":"agent-1"},{"source":"agent-2","target":"finish-1"}],"recursionLimit":25}'::jsonb,
    'custom',
    true,
    null
  ),
  (
    'Data Extraction Pipeline',
    'Extract structured data from documents: extractor agent parses raw input, validator agent checks and corrects the output.',
    '{"nodes":[{"id":"start-1","type":"startNode","label":"Start"},{"id":"agent-1","type":"agentNode","label":"Extractor","model_provider":"OpenAI","model_name":"GPT-4o","context":"Extract structured fields (names, dates, amounts) from the provided document.","task_type":"extraction","expected_output_size":"medium"},{"id":"agent-2","type":"agentNode","label":"Validator","model_provider":"Anthropic","model_name":"Claude-3.5-Sonnet","context":"Validate extracted data for completeness and correctness. Fix any errors.","task_type":"classification","expected_output_size":"medium"},{"id":"finish-1","type":"finishNode","label":"Finish"}],"edges":[{"source":"start-1","target":"agent-1"},{"source":"agent-1","target":"agent-2"},{"source":"agent-2","target":"finish-1"}],"recursionLimit":25}'::jsonb,
    'rag',
    true,
    null
  ),
  (
    'Multi-Model Comparison',
    'Compare outputs from multiple models: send the same prompt to GPT-4o and Claude, then aggregate and compare results.',
    '{"nodes":[{"id":"start-1","type":"startNode","label":"Start"},{"id":"agent-1","type":"agentNode","label":"GPT-4o","model_provider":"OpenAI","model_name":"GPT-4o","context":"Answer the question thoroughly.","task_type":"generation","expected_output_size":"medium"},{"id":"agent-2","type":"agentNode","label":"Claude","model_provider":"Anthropic","model_name":"Claude-3.5-Sonnet","context":"Answer the question thoroughly.","task_type":"generation","expected_output_size":"medium"},{"id":"agent-3","type":"agentNode","label":"Comparator","model_provider":"OpenAI","model_name":"GPT-4o-mini","context":"Compare the two responses for accuracy, completeness, and style. Produce a summary of differences.","task_type":"summarization","expected_output_size":"medium"},{"id":"finish-1","type":"finishNode","label":"Finish"}],"edges":[{"source":"start-1","target":"agent-1"},{"source":"start-1","target":"agent-2"},{"source":"agent-1","target":"agent-3"},{"source":"agent-2","target":"agent-3"},{"source":"agent-3","target":"finish-1"}],"recursionLimit":25}'::jsonb,
    'custom',
    true,
    null
  );
