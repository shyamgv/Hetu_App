import api from './api';
import type { UsageOut } from '../types/api.types';

export const UsageService = {
  /** GET /usage/today */
  async getToday(): Promise<UsageOut> {
    const res = await api.get<UsageOut>('/usage/today');
    return res.data;
  },
};
