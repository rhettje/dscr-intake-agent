import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

const UNDERWRITER_SYSTEM_INSTRUCTION = `
You are a Senior Underwriting Review Agent for a private real estate lender.
Your job is to review completed loan intake files and generate a structured executive summary memo for human underwriters and loan committees.

Your memo must include:
1. Loan Snapshot (Loan Amount, Property Value, LTV, Monthly Rent, PITIA, DSCR)
2. Risk Tier Classification (Approved vs. Needs Review vs. Declined)
3. Key Deal Strengths
4. Identified Risks or Mitigants (e.g., borderline DSCR, liquidity, property type)
5. Missing Documents Required for Full Approval
6. Recommended Next Step
`;

export async function generateUnderwritingReview(leadData: {
  borrower_name: string;
  loan_amount: number;
  property_value: number;
  monthly_rent: number;
  credit_score: number;
  dscr: number;
  ltv: number;
  status: string;
  notes: string;
}): Promise<string> {
  const prompt = `
Please generate an Underwriting Review Memo for the following loan submission:
- Borrower: ${leadData.borrower_name}
- Loan Amount: $${leadData.loan_amount.toLocaleString()}
- Property Value: $${leadData.property_value.toLocaleString()}
- Monthly Rent: $${leadData.monthly_rent.toLocaleString()}
- Credit Score: ${leadData.credit_score}
- DSCR: ${leadData.dscr}
- LTV: ${(leadData.ltv * 100).toFixed(1)}%
- Intake Status: ${leadData.status}
- Intake Notes: ${leadData.notes}
  `;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      systemInstruction: UNDERWRITER_SYSTEM_INSTRUCTION,
      temperature: 0.1
    }
  });

  return response.text || 'Error generating underwriting memo.';
}
