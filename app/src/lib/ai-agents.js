// AI Agents — wraps OpenAI calls with PII redaction, logging, fallback.
const OpenAI = require('openai');
const { getDb } = require('./db');

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

let _client = null;
function client() {
  if (!_client) {
    const key = process.env.OPENAI_API_KEY;
    if (!key || key === 'sk-your-openai-key-here') return null;
    _client = new OpenAI({ apiKey: key });
  }
  return _client;
}

// ---------- PII REDACTION ----------
// Replace customer-identifying tokens before sending to LLM.
function redactPII(text, customer) {
  if (!text) return text;
  let out = text;
  if (customer?.name) out = out.split(customer.name).join('[CUSTOMER]');
  if (customer?.customer_code) out = out.split(customer.customer_code).join('[CUST_CODE]');
  return out;
}

// ---------- Invocation logger ----------
async function invokeAndLog({ deviationId, agentType, prompt, schema }) {
  const c = client();
  const started = Date.now();
  if (!c) {
    // Graceful fallback when key missing — synthetic response for demo continuity.
    const fallback = synthFallback(agentType, prompt);
    logInvocation({
      deviationId, agentType, model: 'fallback-mock',
      prompt, response: JSON.stringify(fallback),
      confidence: 0.5, tokensUsed: 0, durationMs: Date.now() - started,
    });
    return fallback;
  }
  try {
    const messages = [
      { role: 'system', content: systemFor(agentType) },
      { role: 'user', content: prompt },
    ];
    const params = {
      model: MODEL,
      messages,
      temperature: tempFor(agentType),
      max_tokens: 600,
    };
    if (schema) params.response_format = { type: 'json_object' };
    const resp = await c.chat.completions.create(params);
    const text = resp.choices[0].message.content || '';
    const tokens = resp.usage?.total_tokens || 0;
    const parsed = schema ? safeParseJSON(text, agentType) : { text };
    logInvocation({
      deviationId, agentType, model: MODEL,
      prompt, response: text,
      confidence: parsed.confidence ?? 0.85,
      tokensUsed: tokens, durationMs: Date.now() - started,
    });
    return parsed;
  } catch (err) {
    // API failure — log and return mock so workflow continues (FR-NFR resilience).
    const fallback = synthFallback(agentType, prompt);
    fallback._error = err.message;
    logInvocation({
      deviationId, agentType, model: MODEL,
      prompt, response: 'ERROR: ' + err.message,
      confidence: 0, tokensUsed: 0, durationMs: Date.now() - started,
    });
    return fallback;
  }
}

function tempFor(agentType) {
  return { JUSTIFICATION: 0.4, RISK_SCORING: 0.2, CONTEXT_SUMMARY: 0.3, POLICY_INTERPRETATION: 0.1 }[agentType] ?? 0.3;
}

function systemFor(agentType) {
  return {
    JUSTIFICATION:
      "You are a compliance-aware drafter for a telecom operator. Write concise, professional business justifications for operational deviations. Cite policy reasoning when relevant. Keep tone factual; no marketing language. Max 200 words. Never name end-customers; use [CUSTOMER] placeholder.",
    RISK_SCORING:
      "You are a risk-scoring agent for telecom deviations. Respond with strict JSON: {\"score\":\"LOW|MEDIUM|HIGH\",\"factors\":[{\"factor\":string,\"weight\":0-1,\"value\":string}],\"confidence\":0-1,\"rationale\":string}. Consider financial impact, regulatory exposure, customer tier, KYC status, recurrence.",
    CONTEXT_SUMMARY:
      "You are an approval-assist agent. Write one paragraph (60-90 words) summarising a customer + service profile for an approver. Be neutral, factual, no recommendations. Use [CUSTOMER] in place of names.",
    POLICY_INTERPRETATION:
      "You are a policy-citation agent. Respond with strict JSON: {\"citations\":[{\"policy_code\":string,\"title\":string,\"snippet\":string,\"relevance\":0-1}]}. Cite at most 3 most relevant policies."
  }[agentType] || "Assist the user.";
}

function safeParseJSON(text, agentType) {
  try { return JSON.parse(text); }
  catch { return synthFallback(agentType, ''); }
}

// ---------- Fallbacks (mock responses if key missing or call fails) ----------
function synthFallback(agentType, prompt) {
  switch (agentType) {
    case 'JUSTIFICATION':
      return { text: "Justification (fallback): This deviation is requested to address an operational gap impacting [CUSTOMER]. The requested action aligns with internal escalation procedures and is needed to preserve customer commitments while remaining within revenue-control and compliance guardrails." };
    case 'RISK_SCORING':
      return {
        score: prompt.includes('amount') && /\b(\d{4,})\b/.test(prompt) ? 'MEDIUM' : 'LOW',
        factors: [
          { factor: 'Financial impact', weight: 0.4, value: 'within tolerance' },
          { factor: 'Regulatory exposure', weight: 0.3, value: 'standard' },
          { factor: 'Customer tier', weight: 0.3, value: 'GOLD/PLATINUM' },
        ],
        confidence: 0.55,
        rationale: 'Fallback heuristic score: limited inputs available.',
      };
    case 'CONTEXT_SUMMARY':
      return { text: "Customer profile (fallback): [CUSTOMER] is a recurring enterprise account with active services and a verified compliance status. Recent deviation history shows low volume. Service profile suggests standard operational risk." };
    case 'POLICY_INTERPRETATION':
      return { citations: [{ policy_code: 'POL-GEN-000', title: 'General Authority Matrix', snippet: 'Approvals follow tiered thresholds; see internal policy.', relevance: 0.6 }] };
  }
  return {};
}

function logInvocation({ deviationId, agentType, model, prompt, response, confidence, tokensUsed, durationMs }) {
  try {
    getDb().prepare(`
      INSERT INTO ai_invocations (deviation_id, agent_type, model, prompt, response, confidence, tokens_used, duration_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(deviationId || null, agentType, model, prompt, response, confidence ?? null, tokensUsed ?? null, durationMs);
  } catch (e) { /* logging must never break business flow */ }
}

// ---------- High-level helpers ----------
async function generateJustification({ deviationId, deviationType, customer, service, requestedAction, amount, duration }) {
  const prompt = `Draft a justification for a ${deviationType} deviation.
Customer tier: ${customer?.tier}, monthly revenue: ${customer?.monthly_revenue}, KYC: ${customer?.kyc_status}.
Service: ${service?.service_type}, bandwidth: ${service?.bandwidth_mbps}Mbps, SLA: ${service?.sla_tier}.
Requested action: ${redactPII(requestedAction, customer)}.
Amount: ${amount || 'n/a'}. Duration: ${duration || 'n/a'} days.
Draft a professional 100-150 word justification.`;
  return invokeAndLog({ deviationId, agentType: 'JUSTIFICATION', prompt });
}

async function scoreRisk({ deviationId, deviationType, customer, amount, duration, historicalCount }) {
  const prompt = `Score the risk of this deviation as JSON.
Type: ${deviationType}. Amount: ${amount || 0}. Duration: ${duration || 0} days.
Customer tier: ${customer?.tier}. KYC: ${customer?.kyc_status}. Monthly revenue: ${customer?.monthly_revenue}.
Past deviations on same customer: ${historicalCount}.`;
  return invokeAndLog({ deviationId, agentType: 'RISK_SCORING', prompt, schema: true });
}

async function summariseContext({ deviationId, customer, service, historicalCount }) {
  const prompt = `Summarise this customer + service for an approver.
Customer tier: ${customer?.tier}, monthly revenue: ${customer?.monthly_revenue}, KYC: ${customer?.kyc_status}.
Service: ${service?.service_type}, bandwidth: ${service?.bandwidth_mbps}Mbps, SLA: ${service?.sla_tier}.
Past deviations: ${historicalCount}.`;
  return invokeAndLog({ deviationId, agentType: 'CONTEXT_SUMMARY', prompt });
}

async function interpretPolicy({ deviationId, deviationType, requestedAction, policies }) {
  const policyList = policies.map(p => `- ${p.code}: ${p.title} -- ${p.content.slice(0, 240)}`).join('\n');
  const prompt = `Return up to 3 most relevant policy citations as JSON.
Deviation type: ${deviationType}.
Requested action: ${requestedAction}.
Available policies:
${policyList}`;
  return invokeAndLog({ deviationId, agentType: 'POLICY_INTERPRETATION', prompt, schema: true });
}

module.exports = { generateJustification, scoreRisk, summariseContext, interpretPolicy };
