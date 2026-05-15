import { api } from '../api';
import { CustomerInteraction, CustomerInteractionCreate } from './types';

export const InteractionsApi = {
  listInteractions: async (
    companyId: string | number,
    params?: { customer_id?: number; employee_id?: number }
  ): Promise<CustomerInteraction[]> => {
    const response = await api.get(`/companies/${companyId}/interactions`, { params });
    return response.data;
  },

  logInteraction: async (
    companyId: string | number,
    interaction: CustomerInteractionCreate
  ): Promise<CustomerInteraction> => {
    const response = await api.post(`/companies/${companyId}/interactions`, interaction);
    return response.data;
  },
};
