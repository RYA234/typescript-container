import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChatResponse } from '../interfaces';
import { config } from '../shared';

export class ChatbotService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  async chat(message: string): Promise<ChatResponse> {
    try {
      const result = await this.model.generateContent(message);
      const response = await result.response;
      const text = response.text();

      return {
        reply: text,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error('Failed to generate response from Gemini API');
    }
  }
}
