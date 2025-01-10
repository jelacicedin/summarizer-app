import { OpenAI } from "openai";
import 'dotenv/config'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});


// Map to store conversation history for each paper
const conversationContexts: Map<number, { role: 'system' | 'user' | 'assistant'; content: string }[]> = new Map();

export async function summarizeTextForPaper(
  paperId: number,
  text: string,
  correction?: string
): Promise<string> {
  try {
    // Initialize context for the paper if it doesn't exist
    if (!conversationContexts.has(paperId)) {
      conversationContexts.set(paperId, [
        { role: 'system', content: 'You are a summarization assistant.' },
      ]);
    }

    // Get the context for the paper
    const conversationHistory = conversationContexts.get(paperId)!;

    // Add the user's initial request or correction
    if (!correction) {
      conversationHistory.push({
        role: 'user',
        content: `Summarize the following text:\n\n${text}`,
      });
    } else {
      conversationHistory.push({
        role: 'user',
        content: correction,
      });
    }

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: conversationHistory,
      max_tokens: 500,
    });

    // Get the assistant's reply
    const assistantReply = response.choices[0].message?.content;

    if (assistantReply) {
      // Add assistant's response to the context
      conversationHistory.push({ role: 'assistant', content: assistantReply });
      return assistantReply.trim();
    } else {
      return 'Empty string, as response is null...';
    }
  } catch (e: any) {
    console.error(e.message);
    return e.message;
  }
}

// Reset the context for a specific paper (optional)
export function resetContextForPaper(paperId: number): void {
  conversationContexts.delete(paperId);
}
