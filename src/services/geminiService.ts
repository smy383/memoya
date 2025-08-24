import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
  }

  async generateResponse(prompt: string): Promise<string> {
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating response:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  async generateChatResponse(messages: string[], currentMessage: string): Promise<string> {
    try {
      const context = messages.slice(-5).join('\n');
      const prompt = `이전 대화 내용:\n${context}\n\n사용자 메시지: ${currentMessage}\n\n위 내용을 바탕으로 자연스럽고 도움이 되는 답변을 해주세요.`;
      
      return await this.generateResponse(prompt);
    } catch (error) {
      console.error('Error in chat response:', error);
      throw error;
    }
  }
}