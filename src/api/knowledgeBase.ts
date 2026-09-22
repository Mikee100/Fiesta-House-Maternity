import axios from 'axios';

import { API_BASE_URL } from '@/config';

const API_URL = `${API_BASE_URL}/api/knowledge-base`; // Adjust if base URL is different

export interface KBEntry {
    id: string;
    question: string;
    answer: string;
    category: string;
    createdAt?: string;
    updatedAt?: string;
    mediaUrls?: string[];
}

export const knowledgeBaseApi = {
    getAll: async (params?: { category?: string; search?: string }) => {
        const response = await axios.get(API_URL, { params });
        return response.data; // { items: [], total: number }
    },

    create: async (data: { question: string; answer: string; category: string }) => {
        const response = await axios.post(API_URL, data);
        return response.data;
    },

    update: async (id: string, data: Partial<{ question: string; answer: string; category: string }>) => {
        const response = await axios.patch(`${API_URL}/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await axios.delete(`${API_URL}/${id}`);
        return response.data;
    },
};
