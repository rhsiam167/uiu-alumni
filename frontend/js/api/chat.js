// Chat API client endpoints

import { apiClient } from './client.js';

export const chatApi = {
  getConversations: async () => {
    return await apiClient.get('/chat/conversations');
  },
  
  getMessages: async (userId) => {
    return await apiClient.get(`/chat/conversations/${userId}/messages`);
  },

  sendMessage: async (userId, payload) => {
    return await apiClient.post(`/chat/conversations/${userId}/messages`, payload);
  },

  unsendMessage: async (messageId) => {
    return await apiClient.delete(`/chat/messages/${messageId}`);
  },

  deleteConversation: async (userId) => {
    return await apiClient.delete(`/chat/conversations/${userId}`);
  }
};
