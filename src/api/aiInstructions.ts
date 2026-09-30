import axios from 'axios';
import { API_BASE_URL } from '@/config';

export async function fetchAiInstructions(): Promise<string> {
  const response = await axios.get<{ instructions: string }>(`${API_BASE_URL}/api/ai-instructions`);
  return response.data.instructions;
}