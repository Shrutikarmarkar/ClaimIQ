import { Verdict, RiskLevel } from '../types';
import { SAMPLE_CLAIMS } from '../sampleClaims';

export interface EvalEntry {
  claimId: string;
  label: string;
  claimText: string;
  expectedVerdict: Verdict;
  expectedRiskLevel: RiskLevel;
  notes: string;
}

const c = (id: string) => SAMPLE_CLAIMS.find(s => s.id === id)!;

export const GOLDEN_DATASET: EvalEntry[] = [
  {
    claimId: 'claim-1',
    label: c('claim-1').label,
    claimText: c('claim-1').text,
    expectedVerdict: 'Approve',
    expectedRiskLevel: 'LOW',
    notes:
      'Textbook clean claim: first-time claimant, police report filed at scene, two independent repair estimates within $500 of each other, third-party fault documented by responding officer. All 4 investigation checks should score LOW. Agent 3 should approve outright near the claimed amount.',
  },
  {
    claimId: 'claim-2',
    label: c('claim-2').label,
    claimText: c('claim-2').text,
    expectedVerdict: 'Investigate',
    expectedRiskLevel: 'HIGH',
    notes:
      '4 prior claims in 24 months including a prior fire/smoke claim 8 months earlier (HIGH for claims-history pattern). Narrative is extremely vague — no fire cause, no fire department report number, no itemised damage list (HIGH for narrative consistency). Two HIGH flags trigger Investigate or Deny; Investigate is the expected floor verdict pending SIU review.',
  },
  {
    claimId: 'claim-3',
    label: c('claim-3').label,
    claimText: c('claim-3').text,
    expectedVerdict: 'Approve',
    expectedRiskLevel: 'MEDIUM',
    notes:
      'One prior workers-comp claim from 2022 for a different injury type (repetitive strain vs chemical burn) may score MEDIUM on claims-history, but all other checks should be LOW. OSHA incident report, 3 named witnesses, named burn specialist, itemised medical bills, and documented lost wages make this well-evidenced. Amount is proportionate to documented costs.',
  },
  {
    claimId: 'claim-4',
    label: c('claim-4').label,
    claimText: c('claim-4').text,
    expectedVerdict: 'Approve',
    expectedRiskLevel: 'LOW-MEDIUM',
    notes:
      'First-time claimant with full documentation: police report with case number, VIN and registration provided, both key fobs accounted for, BMW GPS data shared with law enforcement, garage security footage confirmed. Claimed amount ($45k) is $1,200 below NADA clean value — not inflated. Vehicle theft is inherently harder to verify than collision, hence LOW-MEDIUM risk, but evidence quality supports approval.',
  },
  {
    claimId: 'claim-5',
    label: c('claim-5').label,
    claimText: c('claim-5').text,
    expectedVerdict: 'Investigate',
    expectedRiskLevel: 'HIGH',
    notes:
      'Two prior settled slip-and-fall claims (2021, 2023) is a HIGH flag for claims-history pattern. Uncertain incident date and location, no incident report filed, no manager contacted, unnamed treating physician, pre-existing back condition mixed into medical costs, and undocumented lost wages all drive HIGH narrative-consistency and documentation flags. Serial premises-liability history combined with vague narrative warrants mandatory investigation before any payout.',
  },
];
