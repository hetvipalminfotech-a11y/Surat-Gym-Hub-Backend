import { RowDataPacket } from 'mysql2';

export interface DailySummaryReport extends RowDataPacket {
  total_checkins: number;
  total_pt_sessions: number;
  new_memberships: number;
  renewals: number;
  membership_revenue: number;
  pt_revenue: number;
  total_revenue: number;
  peak_hour: number | null;
}

export interface MembershipExpiryReport extends RowDataPacket {
  member_code: string;
  name: string;
  phone: string;
  plan_name: string;
  start_date: string;
  end_date: string;
  days_remaining: number;
  remaining_pt_sessions: number;
  expiry_status: 'EXPIRED' | 'EXPIRING_SOON' | 'ACTIVE';
}

export interface TrainerUtilisationReport extends RowDataPacket {
  id: number;
  trainer_name: string;
  specialization: string;
  total_sessions_this_month: number;
  available_slots: number;
  booked_slots: number;
  no_show_count: number;
  utilisation_rate: number;
  revenue: number;
  commission_earned: number;
}

export interface RevenueAnalysisReport extends RowDataPacket {
  id: number;
  plan_name: string;
  total_sales: number;
  plan_revenue: number;
  total_membership_revenue: number;
  total_pt_revenue: number;
  is_most_popular_plan: 'YES' | 'NO';
  most_popular_specialization: string;
}
