import { OpenAI } from "openai";
import 'dotenv/config';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Map to store conversation history for each paper
const conversationContexts: Map<number, { role: 'system' | 'user' | 'assistant'; content: string }[]> = new Map();

// Maximum number of messages to retain in the context for a paper
const MAX_CONTEXT_MESSAGES = 10;

export async function summarizeTextForPaper(
  paperId: number,
  text: string,
  correction?: string
): Promise<string> {
  try {
    if (!text && !correction) {
      throw new Error("Both text and correction are empty. Provide at least one.");
    }

    // Initialize context for the paper if it doesn't exist
    if (!conversationContexts.has(paperId)) {
      conversationContexts.set(paperId, [
        {
          role: 'system',
          content: `You are an advanced text summarizer. Your task is to summarize research papers into high-quality summaries tailored for social media. 
          
          The summary must:
          - Be engaging, concise, and informative.
          - Avoid unnecessary jargon, keeping it accessible to a broad audience.
          - Focus exclusively on the key findings, contributions, or implications of the research.
          - Avoid conversational phrases like "here's the summary" or "let's dive in." Provide only the final, polished text.
          - Make the output presentable, as if you were posting it on a website. Thus, you don't need to make it ultra-short. You can go into detail on important things.
          
          Output only the summary. Do not include any extra comments, explanations, or text.`,
        },
      ]);
    }

    // Retrieve the conversation history for the paper
    const conversationHistory = conversationContexts.get(paperId)!;

    // Add the user's initial request or correction
    if (correction) {
      conversationHistory.push({
        role: 'user',
        content: correction,
      });
    } else {
      conversationHistory.push({
        role: 'user',
        content: `Summarize the following text:\n\n${text}`,
      });
    }

    // Truncate the context if it exceeds the maximum limit
    if (conversationHistory.length > MAX_CONTEXT_MESSAGES) {
      const systemMessage = conversationHistory[0]; // Keep the system role message
      const trimmedHistory = conversationHistory.slice(-MAX_CONTEXT_MESSAGES + 1);
      conversationContexts.set(paperId, [systemMessage, ...trimmedHistory]);
    }

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: conversationHistory,
      max_tokens: 5000,
    });

    // Get the assistant's reply
    const assistantReply = response.choices[0].message?.content;

    if (assistantReply) {
      // Add the assistant's response to the context
      conversationHistory.push({ role: 'assistant', content: assistantReply });
      return assistantReply.trim();
    } else {
      throw new Error("Empty response received from the API.");
    }
  } catch (error: any) {
    console.error(`Error summarizing text for paper ID ${paperId}:`, error.message);
    throw error; // Rethrow the error to handle it at a higher level if needed
  }
}

// Reset the context for a specific paper
export function resetContextForPaper(paperId: number): void {
  if (conversationContexts.has(paperId)) {
    conversationContexts.delete(paperId);
    console.debug(`Context reset for paper ID ${paperId}`);
  } else {
    console.warn(`No context found to reset for paper ID ${paperId}`);
  }
}
