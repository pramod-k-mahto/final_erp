import { api } from '../api';
import { Resource, ResourceGroup, ResourceCreate, ResourceGroupCreate } from './types';

export const ResourcesApi = {
  listGroups: async (companyId: string | number): Promise<ResourceGroup[]> => {
    const response = await api.get(`/companies/${companyId}/resources/groups`);
    return response.data;
  },

  createGroup: async (companyId: string | number, group: ResourceGroupCreate): Promise<ResourceGroup> => {
    const response = await api.post(`/companies/${companyId}/resources/groups`, group);
    return response.data;
  },

  createResource: async (companyId: string | number, resource: ResourceCreate): Promise<Resource> => {
    const response = await api.post(`/companies/${companyId}/resources`, resource);
    return response.data;
  },

  deleteResource: async (companyId: string | number, resourceId: number): Promise<void> => {
    await api.delete(`/companies/${companyId}/resources/${resourceId}`);
  },
};
