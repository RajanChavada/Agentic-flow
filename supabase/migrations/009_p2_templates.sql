-- Supabase migration: seed 7 new P2-05 templates
-- Run in Supabase SQL Editor (Dashboard > SQL > New Query)

insert into public.workflow_templates (name, description, graph, category, is_curated, user_id)
values
  (
    'ReAct Agent',
    'A powerful ReAct (Reason + Act) loop pattern where the agent thinks, selects a tool, observes the result, and loops until the task is complete.',
    '{"nodes":[{"id":"start-1","type":"startNode","label":"Task Input","position":{"x":100,"y":100}},{"id":"agent-react","type":"agentNode","label":"ReAct Agent","model_provider":"Anthropic","model_name":"Claude-3.5-Sonnet","context":"You are a ReAct agent. You must loop: Thought -> Action -> Observation until you find the final answer.","task_type":"tool_orchestration","expected_output_size":"long","position":{"x":300,"y":100}},{"id":"tool-search","type":"toolNode","label":"Search Engine","tool_id":"mcp_web_search","position":{"x":500,"y":100}},{"id":"finish-1","type":"finishNode","label":"Final Answer","position":{"x":300,"y":300}}],"edges":[{"id":"e1","source":"start-1","target":"agent-react"},{"id":"e2","source":"agent-react","target":"tool-search"},{"id":"e3","source":"tool-search","target":"agent-react"},{"id":"e4","source":"agent-react","target":"finish-1"}],"recursionLimit":25}'::jsonb,
    'orchestration',
    true,
    null
  ),
  (
    'Plan & Execute',
    'Separates concerns: A Planner breaks down the task, an Executor completes the steps sequentially, and a Synthesizer formats the final response.',
    '{"nodes":[{"id":"start-1","type":"startNode","label":"User Goal","position":{"x":100,"y":100}},{"id":"agent-planner","type":"agentNode","label":"Planner","model_provider":"OpenAI","model_name":"o1-mini","context":"Break down the user goal into a step-by-step plan.","task_type":"planning","expected_output_size":"medium","position":{"x":300,"y":100}},{"id":"agent-executor","type":"agentNode","label":"Executor","model_provider":"OpenAI","model_name":"GPT-4o","context":"Execute the steps defined by the Planner.","task_type":"tool_orchestration","expected_output_size":"long","position":{"x":500,"y":100}},{"id":"tool-execution","type":"toolNode","label":"Execution Tool","tool_id":"mcp_filesystem","position":{"x":700,"y":100}},{"id":"agent-synth","type":"agentNode","label":"Synthesizer","model_provider":"Anthropic","model_name":"Claude-3-Haiku","context":"Summarize the results into a final user-friendly response.","task_type":"summarization","expected_output_size":"short","position":{"x":500,"y":300}},{"id":"finish-1","type":"finishNode","label":"Output","position":{"x":700,"y":300}}],"edges":[{"id":"e1","source":"start-1","target":"agent-planner"},{"id":"e2","source":"agent-planner","target":"agent-executor"},{"id":"e3","source":"agent-executor","target":"tool-execution"},{"id":"e4","source":"tool-execution","target":"agent-executor"},{"id":"e5","source":"agent-executor","target":"agent-synth"},{"id":"e6","source":"agent-synth","target":"finish-1"}],"recursionLimit":25}'::jsonb,
    'orchestration',
    true,
    null
  ),
  (
    'Multi-Agent Handoff',
    'A chain of specialized agents. Useful for complex workflows like content creation (Writer -> Editor -> SEO Specialist -> Publisher).',
    '{"nodes":[{"id":"start-1","type":"startNode","label":"Start","position":{"x":100,"y":100}},{"id":"agent-writer","type":"agentNode","label":"Writer","model_provider":"Anthropic","model_name":"Claude-3.5-Sonnet","context":"Draft initial content based on user prompt.","task_type":"content_generation","expected_output_size":"long","position":{"x":300,"y":100}},{"id":"agent-editor","type":"agentNode","label":"Editor","model_provider":"OpenAI","model_name":"GPT-4o","context":"Review, edit, and refine the drafted content.","task_type":"proofreading","expected_output_size":"long","position":{"x":500,"y":100}},{"id":"agent-seo","type":"agentNode","label":"SEO Optimize","model_provider":"Google","model_name":"Gemini-1.5-Pro","context":"Optimize content with SEO keywords.","task_type":"seo_optimization","expected_output_size":"long","position":{"x":700,"y":100}},{"id":"finish-1","type":"finishNode","label":"Publish","position":{"x":900,"y":100}}],"edges":[{"id":"e1","source":"start-1","target":"agent-writer"},{"id":"e2","source":"agent-writer","target":"agent-editor"},{"id":"e3","source":"agent-editor","target":"agent-seo"},{"id":"e4","source":"agent-seo","target":"finish-1"}],"recursionLimit":25}'::jsonb,
    'custom',
    true,
    null
  ),
  (
    'Self-Critique Loop',
    'A generative agent produces an output, a critic agent evaluates it, and it loops back to the generator if the criteria are not met.',
    '{"nodes":[{"id":"start-1","type":"startNode","label":"Prompt","position":{"x":100,"y":100}},{"id":"agent-gen","type":"agentNode","label":"Generator","model_provider":"Anthropic","model_name":"Claude-3.5-Sonnet","context":"Generate the artifact. Improve it based on critique.","task_type":"code_generation","expected_output_size":"long","position":{"x":300,"y":100}},{"id":"agent-crit","type":"agentNode","label":"Critic","model_provider":"OpenAI","model_name":"o1-mini","context":"Evaluate the artifact against requirements. If it fails, provide critique. If it passes, output SUCCESS.","task_type":"review","expected_output_size":"medium","position":{"x":500,"y":100}},{"id":"cond-1","type":"conditionNode","label":"Pass?","conditionExpression":"output.includes(\"SUCCESS\")","position":{"x":500,"y":300}},{"id":"finish-1","type":"finishNode","label":"Final output","position":{"x":700,"y":300}}],"edges":[{"id":"e1","source":"start-1","target":"agent-gen"},{"id":"e2","source":"agent-gen","target":"agent-crit"},{"id":"e3","source":"agent-crit","target":"cond-1"},{"id":"e4","source":"cond-1","target":"finish-1","sourceHandle":"true"},{"id":"e5","source":"cond-1","target":"agent-gen","sourceHandle":"false"}],"recursionLimit":25}'::jsonb,
    'orchestration',
    true,
    null
  ),
  (
    'Structured Extraction',
    'Used for taking unstructured text, extracting entities, and formatting the output into strict JSON or tabular format.',
    '{"nodes":[{"id":"start-1","type":"startNode","label":"Raw Text","position":{"x":100,"y":100}},{"id":"agent-ext","type":"agentNode","label":"Extractor","model_provider":"OpenAI","model_name":"GPT-4o-mini","context":"Extract all specific entities (Names, Dates, Locations) from the raw text.","task_type":"data_extraction","expected_output_size":"medium","position":{"x":300,"y":100}},{"id":"agent-fmt","type":"agentNode","label":"Formatter","model_provider":"Anthropic","model_name":"Claude-3-Haiku","context":"Format the extracted entities into strict JSON format.","task_type":"formatting","expected_output_size":"medium","position":{"x":500,"y":100}},{"id":"finish-1","type":"finishNode","label":"JSON Output","position":{"x":700,"y":100}}],"edges":[{"id":"e1","source":"start-1","target":"agent-ext"},{"id":"e2","source":"agent-ext","target":"agent-fmt"},{"id":"e3","source":"agent-fmt","target":"finish-1"}],"recursionLimit":25}'::jsonb,
    'custom',
    true,
    null
  ),
  (
    'Cost Comparison',
    'A unique Neurovn testing template. A single prompt runs parallel across multiple tier-1 models for direct A/B/C cost and latency comparison.',
    '{"nodes":[{"id":"start-1","type":"startNode","label":"Input Prompt","position":{"x":100,"y":200}},{"id":"agent-a","type":"agentNode","label":"GPT-4o","model_provider":"OpenAI","model_name":"GPT-4o","context":"Answer the prompt.","task_type":"general","position":{"x":300,"y":100}},{"id":"agent-b","type":"agentNode","label":"Claude-3.5-Sonnet","model_provider":"Anthropic","model_name":"Claude-3.5-Sonnet","context":"Answer the prompt.","task_type":"general","position":{"x":300,"y":200}},{"id":"agent-c","type":"agentNode","label":"Gemini-1.5-Pro","model_provider":"Google","model_name":"Gemini-1.5-Pro","context":"Answer the prompt.","task_type":"general","position":{"x":300,"y":300}},{"id":"finish-1","type":"finishNode","label":"Compare Logs","position":{"x":500,"y":200}}],"edges":[{"id":"e1","source":"start-1","target":"agent-a"},{"id":"e2","source":"start-1","target":"agent-b"},{"id":"e3","source":"start-1","target":"agent-c"},{"id":"e4","source":"agent-a","target":"finish-1"},{"id":"e5","source":"agent-b","target":"finish-1"},{"id":"e6","source":"agent-c","target":"finish-1"}],"recursionLimit":25}'::jsonb,
    'custom',
    true,
    null
  ),
  (
    'Human-in-the-Loop',
    'An agent performs research, but must await human review (simulated via boolean condition) before taking destructive action.',
    '{"nodes":[{"id":"start-1","type":"startNode","label":"Goal","position":{"x":100,"y":100}},{"id":"agent-research","type":"agentNode","label":"Analyzer","model_provider":"Anthropic","model_name":"Claude-3.5-Sonnet","context":"Analyze the goal and prepare an action plan. Ask the user for approval.","task_type":"planning","position":{"x":300,"y":100}},{"id":"tool-input","type":"toolNode","label":"Wait for Human","tool_id":"mcp_wait_for_input","position":{"x":500,"y":100}},{"id":"cond-1","type":"conditionNode","label":"Approved?","conditionExpression":"output === \"APPROVE\"","position":{"x":500,"y":300}},{"id":"agent-exec","type":"agentNode","label":"Executer","model_provider":"OpenAI","model_name":"GPT-4o","context":"Execute the approved plan.","task_type":"tool_orchestration","position":{"x":700,"y":300}},{"id":"finish-1","type":"finishNode","label":"Final output","position":{"x":900,"y":300}},{"id":"agent-replan","type":"agentNode","label":"Replanner","model_provider":"Google","model_name":"Gemini-1.5-Flash","context":"Modify plan based on user rejection reasons.","position":{"x":300,"y":300}}],"edges":[{"id":"e1","source":"start-1","target":"agent-research"},{"id":"e2","source":"agent-research","target":"tool-input"},{"id":"e3","source":"tool-input","target":"cond-1"},{"id":"e4","source":"cond-1","target":"agent-exec","sourceHandle":"true"},{"id":"e5","source":"cond-1","target":"agent-replan","sourceHandle":"false"},{"id":"e6","source":"agent-replan","target":"agent-research"},{"id":"e7","source":"agent-exec","target":"finish-1"}],"recursionLimit":25}'::jsonb,
    'orchestration',
    true,
    null
  );
