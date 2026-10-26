import fs from 'fs';
import path from 'path';

export interface Guidelines {
  min_dscr: number;
  preferred_dscr: number;
  max_ltv_rental: number;
  min_credit_score: number;
  default_loan_term_years: number;
}

export function loadGuidelines(): Guidelines {
  const filePath = path.resolve(process.cwd(), 'config/guidelines.json');
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  }
  return {
    min_dscr: 1.00,
    preferred_dscr: 1.25,
    max_ltv_rental: 0.80,
    min_credit_score: 660,
    default_loan_term_years: 30
  };
}

export function calculatePI(loanAmount: number, annualInterestRate: number, termYears: number = 30): number {
  if (loanAmount <= 0 || annualInterestRate <= 0 || termYears <= 0) return 0;
  const monthlyRate = annualInterestRate / 100 / 12;
  const numberOfPayments = termYears * 12;
  const numerator = monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments);
  const denominator = Math.pow(1 + monthlyRate, numberOfPayments) - 1;
  const payment = loanAmount * (numerator / denominator);
  return Number(payment.toFixed(2));
}

export function calculatePITIA(
  loanAmount: number,
  annualInterestRate: number,
  monthlyTaxes: number,
  monthlyInsurance: number,
  monthlyHoa: number = 0,
  termYears: number = 30
): { pi: number; pitia: number } {
  const pi = calculatePI(loanAmount, annualInterestRate, termYears);
  const pitia = Number((pi + monthlyTaxes + monthlyInsurance + monthlyHoa).toFixed(2));
  return { pi, pitia };
}

export function calculateDSCR(monthlyRent: number, monthlyPitia: number): number {
  if (monthlyPitia <= 0) return 0;
  return Number((monthlyRent / monthlyPitia).toFixed(2));
}

export function calculateLTV(loanAmount: number, propertyValue: number): number {
  if (propertyValue <= 0) return 0;
  return Number((loanAmount / propertyValue).toFixed(4));
}

export interface EligibilityInput {
  loanAmount: number;
  propertyValue: number;
  monthlyRent: number;
  annualInterestRate: number;
  monthlyTaxes: number;
  monthlyInsurance: number;
  monthlyHoa?: number;
  creditScore: number;
}

export interface EligibilityResult {
  status: 'APPROVED' | 'NEEDS_REVIEW' | 'DECLINED';
  dscr: number;
  ltv: number;
  pitia: number;
  reasons: string[];
}

export function evaluateEligibility(input: EligibilityInput): EligibilityResult {
  const guidelines = loadGuidelines();
  const reasons: string[] = [];

  const { pitia } = calculatePITIA(
    input.loanAmount,
    input.annualInterestRate,
    input.monthlyTaxes,
    input.monthlyInsurance,
    input.monthlyHoa || 0,
    guidelines.default_loan_term_years
  );

  const dscr = calculateDSCR(input.monthlyRent, pitia);
  const ltv = calculateLTV(input.loanAmount, input.propertyValue);

  let status: 'APPROVED' | 'NEEDS_REVIEW' | 'DECLINED' = 'APPROVED';

  if (input.creditScore < guidelines.min_credit_score) {
    status = 'DECLINED';
    reasons.push(`Credit score ${input.creditScore} is below minimum required (${guidelines.min_credit_score}).`);
  }

  if (ltv > guidelines.max_ltv_rental) {
    status = 'DECLINED';
    reasons.push(`LTV ${(ltv * 100).toFixed(1)}% exceeds maximum allowable rental LTV (${guidelines.max_ltv_rental * 100}%).`);
  }

  if (dscr < guidelines.min_dscr) {
    status = 'DECLINED';
    reasons.push(`DSCR ${dscr} is below hard minimum floor (${guidelines.min_dscr}).`);
  } else if (dscr < guidelines.preferred_dscr && status !== 'DECLINED') {
    status = 'NEEDS_REVIEW';
    reasons.push(`DSCR ${dscr} is below preferred tier (${guidelines.preferred_dscr}) but above minimum; requires underwriter review.`);
  }

  if (status === 'APPROVED') {
    reasons.push(`Deal meets all standard criteria: DSCR ${dscr}, LTV ${(ltv * 100).toFixed(1)}%, Credit ${input.creditScore}.`);
  }

  return { status, dscr, ltv, pitia, reasons };
}
