import { AgentId, AgentRequestBody } from './types';

const AGENT_1_SYSTEM = `You are a senior insurance intake specialist and claims data analyst with 15 years of experience processing auto, property, medical, and liability claims. Your role is to extract and structure all key information from raw claim submissions with clinical precision.

Extract exactly what is stated — never infer, guess, or embellish missing information. If a field is absent or unclear, explicitly state "Not provided" or "Unclear." Your output will be consumed by the Investigation Agent in the next step, so accuracy and completeness are critical.`;

const AGENT_2_SYSTEM = `You are a certified insurance fraud investigator and senior claims examiner with 20 years of field and litigation experience. You have specialized training in behavioral indicators, statistical anomaly detection, and documentation analysis.

Your analysis must be evidence-based and cite specific details from the claim. Do not speculate beyond what the evidence supports, but do not minimize legitimate red flags. Your findings directly feed into the final claim decision.`;

const AGENT_3_SYSTEM = `You are the Chief Claims Adjudicator at ClaimIQ Insurance Group with binding decision authority. You apply evidence-based business rules to render final claim decisions that are legally defensible and fair to all parties.

Decision logic you must apply:
- If any HIGH severity investigation flags exist → INVESTIGATE or DENY based on total evidence weight
- If all flags are LOW severity → APPROVE (note any conditions)
- Mixed severity (some MEDIUM, no HIGH) → INVESTIGATE with specific focus areas named
- Multiple HIGH flags → lean toward DENY with documented justification

Your decision output MUST include the exact labels: VERDICT:, CONFIDENCE:, JUSTIFICATION:, NEXT STEPS:, and PAYOUT RECOMMENDATION:`;

const AGENT_4_LETTER_SYSTEM = `You are a senior claims correspondence specialist at ClaimIQ Insurance Group. You write formal, professionally worded letters that are empathetic, clear, and legally appropriate.

Never be accusatory or condescending. Use plain language — avoid insurance jargon. The claimant should clearly understand what the decision is and exactly what they need to do next. Adhere to standard insurance communication guidelines.`;

const AGENT_4_MEMO_SYSTEM = `You are a senior claims analyst preparing internal case documentation for the assigned adjuster. This memo is strictly for internal use — use technical language, be direct, and reference all risk indicators explicitly. Do not soften findings. The adjuster needs actionable information to resolve this case efficiently.`;

function buildAgent1User(claimText: string): string {
  return `Extract and structure all key information from the following insurance claim submission. Format your response with clearly labeled sections:

**CLAIMANT PROFILE**
- Full Name:
- Incident Date:
- Claim Filing Date:
- Incident Type:
- Incident Location:

**FINANCIAL DETAILS**
- Amount Claimed:
- Prior Claims Count:
- Prior Claims Description:

**INCIDENT NARRATIVE**
- Description Summary: (2-3 sentences)
- Supporting Documentation Referenced:
- Witnesses Mentioned:

**CLAIM QUALITY ASSESSMENT**
- Description Quality Score: [1-10] — [brief reason]
- Claim Category: [Auto / Property / Medical / Liability]
- Missing Fields: [list any absent required information]
- Immediate Flags: [list any obviously suspicious elements, or "None identified"]

---
CLAIM SUBMISSION:
${claimText}`;
}

function buildAgent2User(claimText: string, intakeOutput: string): string {
  return `Conduct a structured investigation of this insurance claim. Run exactly the following 4 checks. Format each check identically with the labeled fields shown.

══════════════════════════════════════════════
CHECK 1: AMOUNT ANOMALY ANALYSIS
══════════════════════════════════════════════
Compare the claimed amount against industry benchmarks for this claim type and severity.
- Finding:
- Severity: [LOW / MEDIUM / HIGH]
- Reason: (cite specific dollar amounts and relevant benchmarks)

══════════════════════════════════════════════
CHECK 2: CLAIMS HISTORY PATTERN
══════════════════════════════════════════════
Evaluate the claimant's prior claims frequency for suspicious velocity or patterns.
- Finding:
- Severity: [LOW / MEDIUM / HIGH]
- Reason: (cite prior claim count, types, and timing)

══════════════════════════════════════════════
CHECK 3: NARRATIVE CONSISTENCY
══════════════════════════════════════════════
Analyze the claim description for internal contradictions, vagueness, or implausible elements.
- Finding:
- Severity: [LOW / MEDIUM / HIGH]
- Reason: (quote specific language from the claim)

══════════════════════════════════════════════
CHECK 4: TIMING & DOCUMENTATION
══════════════════════════════════════════════
Assess whether the reporting timeline and documentation completeness are appropriate.
- Finding:
- Severity: [LOW / MEDIUM / HIGH]
- Reason: (cite specific documentation gaps or timing issues)

══════════════════════════════════════════════
INVESTIGATION SUMMARY
══════════════════════════════════════════════
- Flag Count: LOW: [n] | MEDIUM: [n] | HIGH: [n]
- Overall Risk Indicator: [MINIMAL / ELEVATED / SIGNIFICANT / CRITICAL]
- Most Concerning Element: (1 sentence)

---
INTAKE AGENT OUTPUT:
${intakeOutput}

ORIGINAL CLAIM TEXT:
${claimText}`;
}

function buildAgent3User(
  claimText: string,
  intakeOutput: string,
  investigationOutput: string,
): string {
  return `Review the complete evidence chain below and render a final claim decision. Your response must include all five labeled sections exactly as shown.

VERDICT: [Approve / Investigate / Deny]

CONFIDENCE: [0-100]%

JUSTIFICATION:
[3-5 sentences citing specific findings from the Investigation Agent by check name. Reference exact flag severities, specific evidence, and explain why this verdict is most appropriate.]

NEXT STEPS:
[2-4 bullet points of concrete required actions — documents to obtain, parties to contact, verifications needed]

PAYOUT RECOMMENDATION:
[If Approve: exact suggested payout amount and any deductions from claimed amount. If Investigate: recommended hold amount pending investigation. If Deny: the specific policy basis or fraud indicators supporting denial.]

---
INTAKE AGENT OUTPUT:
${intakeOutput}

INVESTIGATION AGENT OUTPUT:
${investigationOutput}

ORIGINAL CLAIM TEXT:
${claimText}`;
}

function buildAgent4LetterUser(
  claimText: string,
  previousOutputs: AgentRequestBody['previousOutputs'],
): string {
  return `Draft a formal response letter to the claimant based on the adjudication decision below.

The letter must include:
1. Professional salutation using the claimant's full name (extract from intake data)
2. Reference to the specific claim type and incident date
3. A clear, plain-language statement of the decision
4. A respectful explanation of the reasoning (no accusatory language, no jargon)
5. Specific next steps the claimant must take, with any deadlines noted
6. Contact information: "Please contact our Claims Department at claims@claimiq.com or call 1-800-CLAIMIQ (1-800-252-4647)"
7. Professional closing signed by: "ClaimIQ Insurance Group | Claims Processing Division"

Tone: Formal, empathetic, and respectful. The claimant should understand the decision and feel treated with dignity regardless of the outcome.

---
INTAKE DATA (use for claimant name, claim type, incident date):
${previousOutputs.intake ?? 'Not available'}

ADJUDICATION DECISION:
${previousOutputs.decision ?? 'Not available'}

ORIGINAL CLAIM (reference only):
${claimText}`;
}

function buildAgent4MemoUser(previousOutputs: AgentRequestBody['previousOutputs']): string {
  return `Prepare an internal adjuster memo for this claim file. Use the exact structure below:

INTERNAL ADJUSTER MEMO — CONFIDENTIAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CASE SUMMARY
• Claimant: [name from intake]
• Claim Type: [type from intake]
• Amount Claimed: [amount]
• Incident Date: [date]
• Verdict: [verdict] at [confidence]% confidence

RISK FACTORS IDENTIFIED
• [List each flag from the investigation with its severity level]
• [Reference exact check names and findings]

DECISION RATIONALE
• [Why this verdict was rendered — cite specific investigation checks by name]
• [Note any mitigating factors that influenced confidence score]

ADJUSTER ACTION ITEMS
• [Specific steps the adjuster must take to resolve this case]
• [Documents to request, parties to contact, verifications required]
• [Any SIU (Special Investigations Unit) referral recommendation]

PRIORITY LEVEL: [ROUTINE / ELEVATED / URGENT]
ESTIMATED RESOLUTION TIMELINE: [timeframe]
RECOMMENDED FOLLOW-UP DATE: [specific timeframe from today]

---
INTAKE OUTPUT:
${previousOutputs.intake ?? 'Not available'}

INVESTIGATION OUTPUT:
${previousOutputs.investigation ?? 'Not available'}

DECISION OUTPUT:
${previousOutputs.decision ?? 'Not available'}`;
}

export function buildAgentPrompt(
  agentId: AgentId,
  claimText: string,
  previousOutputs: AgentRequestBody['previousOutputs'],
  subTask?: 'letter' | 'memo',
): { system: string; user: string } {
  switch (agentId) {
    case 1:
      return { system: AGENT_1_SYSTEM, user: buildAgent1User(claimText) };
    case 2:
      return {
        system: AGENT_2_SYSTEM,
        user: buildAgent2User(claimText, previousOutputs.intake ?? ''),
      };
    case 3:
      return {
        system: AGENT_3_SYSTEM,
        user: buildAgent3User(
          claimText,
          previousOutputs.intake ?? '',
          previousOutputs.investigation ?? '',
        ),
      };
    case 4:
      if (subTask === 'memo') {
        return { system: AGENT_4_MEMO_SYSTEM, user: buildAgent4MemoUser(previousOutputs) };
      }
      return {
        system: AGENT_4_LETTER_SYSTEM,
        user: buildAgent4LetterUser(claimText, previousOutputs),
      };
  }
}

export function parseVerdictFromOutput(output: string): { verdict: 'Approve' | 'Investigate' | 'Deny'; confidence: number } {
  const verdictMatch = output.match(/VERDICT:\s*(Approve|Investigate|Deny)/i);
  const confidenceMatch = output.match(/CONFIDENCE:\s*(\d+)/i);

  const rawVerdict = verdictMatch?.[1];
  let verdict: 'Approve' | 'Investigate' | 'Deny' = 'Investigate';
  if (rawVerdict) {
    const lower = rawVerdict.toLowerCase();
    if (lower === 'approve') verdict = 'Approve';
    else if (lower === 'deny') verdict = 'Deny';
    else verdict = 'Investigate';
  }

  const confidence = confidenceMatch ? Math.min(100, Math.max(0, parseInt(confidenceMatch[1]))) : 75;
  return { verdict, confidence };
}
