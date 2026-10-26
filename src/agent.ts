import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import dotenv from 'dotenv';
import { calculatePI, calculatePITIA, calculateDSCR, calculateLTV, evaluateEligibility } from './calculators';
import { saveLead } from './db';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const webhookUrl = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhook-test';

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

const calculateDscrTool: FunctionDeclaration = {
  name: 'calculateDscrTool',
  description: 'Calculate the Debt Service Coverage Ratio (DSCR) given monthly rent and monthly PITIA.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      monthlyRent: { type: Type.NUMBER, description: 'Estimated monthly rental income.' },
      monthlyPitia: { type: Type.NUMBER, description: 'Total monthly PITIA.' }
    },
    required: ['monthlyRent', 'monthlyPitia']
  }
};

const evaluateLoanTool: FunctionDeclaration = {
  name: 'evaluateLoanTool',
  description: 'Evaluate complete loan eligibility (DSCR, LTV, credit score) against private lending guidelines.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      loanAmount: { type: Type.NUMBER, description: 'Requested loan amount.' },
      propertyValue: { type: Type.NUMBER, description: 'Estimated property value/purchase price.' },
      monthlyRent: { type: Type.NUMBER, description: 'Estimated monthly rental income.' },
      annualInterestRate: { type: Type.NUMBER, description: 'Annual interest rate percentage (e.g. 7.0).' },
      monthlyTaxes: { type: Type.NUMBER, description: 'Monthly property taxes.' },
      monthlyInsurance: { type: Type.NUMBER, description: 'Monthly hazard/flood insurance.' },
      monthlyHoa: { type: Type.NUMBER, description: 'Monthly HOA dues (if any).' },
      creditScore: { type: Type.NUMBER, description: "Borrower's credit score." }
    },
    required: ['loanAmount', 'propertyValue', 'monthlyRent', 'annualInterestRate', 'monthlyTaxes', 'monthlyInsurance', 'creditScore']
  }
};

const saveLeadTool: FunctionDeclaration = {
  name: 'saveLeadTool',
  description: 'Save the qualified or reviewed loan lead into the local database and notify the CRM via webhook.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      borrower_name: { type: Type.STRING, description: "Borrower's full name." },
      email: { type: Type.STRING, description: "Borrower's email address." },
      phone: { type: Type.STRING, description: "Borrower's phone number." },
      loan_amount: { type: Type.NUMBER, description: 'Requested loan amount.' },
      property_value: { type: Type.NUMBER, description: 'Property value.' },
      monthly_rent: { type: Type.NUMBER, description: 'Monthly rental income.' },
      credit_score: { type: Type.NUMBER, description: 'Credit score.' },
      dscr: { type: Type.NUMBER, description: 'Calculated DSCR.' },
      ltv: { type: Type.NUMBER, description: 'Calculated LTV.' },
      status: { type: Type.STRING, description: 'Status: APPROVED, NEEDS_REVIEW, or DECLINED.' },
      notes: { type: Type.STRING, description: 'Summary notes for the underwriter.' }
    },
    required: ['borrower_name', 'email', 'phone', 'loan_amount', 'property_value', 'monthly_rent', 'credit_score', 'dscr', 'ltv', 'status', 'notes']
  }
};

const tools = [{ functionDeclarations: [calculateDscrTool, evaluateLoanTool, saveLeadTool] }];

const SYSTEM_INSTRUCTION = `
You are an expert AI Loan Intake Specialist for a private real estate lender.
- Converse professionally with real estate investors inquiring about DSCR rental property loans.
- Collect necessary details: loan amount, property value, monthly rent, interest rate, taxes, insurance, and credit score.
- Also collect borrower contact info (name, email, phone) before saving or submitting.
- Use your tools to calculate, evaluate, and save/submit leads to the system.
`;

// Global chat session instance for the web demo
let activeChatSession: any = null;

export async function runIntakeChatWithTelemetry(userMessage: string) {
  if (!activeChatSession) {
    activeChatSession = ai.chats.create({
      model: modelName,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: tools,
        temperature: 0.2
      }
    });
  }

  const toolLog: any[] = [];
  let response = await activeChatSession.sendMessage({ message: userMessage });

  while (response.functionCalls && response.functionCalls.length > 0) {
    const call = response.functionCalls[0];
    let toolResult: any;

    if (call.name === 'calculateDscrTool') {
      const args = call.args as { monthlyRent: number; monthlyPitia: number };
      toolResult = { dscr: calculateDSCR(args.monthlyRent, args.monthlyPitia) };
    } else if (call.name === 'evaluateLoanTool') {
      toolResult = evaluateEligibility(call.args as any);
    } else if (call.name === 'saveLeadTool') {
      const leadData = call.args as any;
      const leadId = saveLead(leadData);

      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'LEAD_CREATED', leadId, ...leadData })
        });
      } catch (err) {
        console.warn('Webhook notification warning:', err);
      }

      toolResult = { success: true, leadId, message: 'Lead successfully saved to database and CRM webhook triggered.' };
    } else {
      toolResult = { error: `Unknown tool: ${call.name}` };
    }

    toolLog.push({ tool: call.name, args: call.args, result: toolResult });

    response = await activeChatSession.sendMessage({
      message: [
        {
          functionResponse: {
            name: call.name,
            response: { result: toolResult }
          }
        }
      ]
    });
  }

  return { reply: response.text, toolLog };
}
