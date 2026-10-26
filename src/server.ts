import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { runIntakeChatWithTelemetry } from './agent';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(process.cwd(), 'public')));

// CRM Webhook Simulator Endpoint
app.post('/api/webhook-test', (req, res) => {
  console.log('--- [CRM Webhook Received] ---');
  console.log(JSON.stringify(req.body, null, 2));
  console.log('------------------------------');
  res.json({ success: true, message: 'Webhook received and processed by CRM simulation.' });
});

// Web UI Chat Endpoint
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  try {
    const result = await runIntakeChatWithTelemetry(message);
    res.json(result);
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`\n========================================`);
  console.log(`DSCR Intake Agent Server running at:`);
  console.log(`http://localhost:${port}`);
  console.log(`========================================\n`);
});
