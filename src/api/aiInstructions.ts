import api from './apiInstance';

export async function fetchAiInstructions(): Promise<string> {
  const response = await api.get<{ instructions: string }>('/ai-instructions');
  return response.data.instructions;
}