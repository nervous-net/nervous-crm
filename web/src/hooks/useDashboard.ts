// ABOUTME: Dashboard data fetching hook using Supabase
// ABOUTME: Aggregates deals, activities, and contacts data

import { useQuery } from '@tanstack/react-query';
import { getDashboardData } from '@/lib/db';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardData,
  });
}
