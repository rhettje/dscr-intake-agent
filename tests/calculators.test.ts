import { describe, it, expect } from 'vitest';
import { calculatePI, calculatePITIA, calculateDSCR, calculateLTV, evaluateEligibility } from '../src/calculators';

describe('Loan Calculators & Eligibility', () => {
  it('correctly calculates monthly Principal & Interest (P&I)', () => {
    // ,000 at 7% for 30 years -> ~1,995.91
    const pi = calculatePI(300000, 7.0, 30);
    expect(pi).toBeCloseTo(1995.91, 1);
  });

  it('correctly calculates PITIA', () => {
    const { pi, pitia } = calculatePITIA(300000, 7.0, 350, 120, 0, 30);
    expect(pi).toBeCloseTo(1995.91, 1);
    // 1995.91 + 350 + 120 = 2465.91
    expect(pitia).toBeCloseTo(2465.91, 1);
  });

  it('correctly calculates DSCR', () => {
    // ,500 rent / ,465.91 PITIA -> ~1.01
    const dscr = calculateDSCR(2500, 2465.91);
    expect(dscr).toBeCloseTo(1.01, 2);
  });

  it('correctly calculates LTV', () => {
    const ltv = calculateLTV(300000, 400000);
    expect(ltv).toBe(0.75);
  });

  it('evaluates eligibility correctly and flags borderline DSCR for review', () => {
    const result = evaluateEligibility({
      loanAmount: 300000,
      propertyValue: 400000,
      monthlyRent: 2500,
      annualInterestRate: 7.0,
      monthlyTaxes: 350,
      monthlyInsurance: 120,
      creditScore: 720
    });

    // P&I = 1995.91, PITIA = 2465.91, DSCR = 1.01 -> NEEDS_REVIEW (between 1.00 and 1.25)
    expect(result.status).toBe('NEEDS_REVIEW');
    expect(result.dscr).toBeCloseTo(1.01, 2);
    expect(result.ltv).toBe(0.75);
  });

  it('declines loans with low credit score', () => {
    const result = evaluateEligibility({
      loanAmount: 200000,
      propertyValue: 300000,
      monthlyRent: 3000,
      annualInterestRate: 6.5,
      monthlyTaxes: 200,
      monthlyInsurance: 100,
      creditScore: 620 // Below 660 minimum
    });

    expect(result.status).toBe('DECLINED');
    expect(result.reasons.some(r => r.includes('Credit score'))).toBe(true);
  });
});
