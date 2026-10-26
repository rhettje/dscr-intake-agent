import readline from 'readline';
import { runIntakeChat } from './agent';
import dotenv from 'dotenv';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('=== DSCR Loan Intake Agent (Milestone 4: DB & Tools) ===');
console.log('Type your message below (type "exit" to quit).\n');

let session: any = undefined;

const promptUser = () => {
  rl.question('Investor: ', async (input) => {
    if (input.toLowerCase() === 'exit') {
      rl.close();
      return;
    }

    try {
      const result = await runIntakeChat(input, session);
      session = result.chatSession;
      console.log(`\nAgent: ${result.reply}\n`);
    } catch (error: any) {
      console.error('\nError:', error.message || error);
    }

    promptUser();
  });
};

promptUser();
