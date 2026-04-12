import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ReportsService {
  constructor(private db: DatabaseService) {}

//   Report 1 — Daily Operations Summary
// For a selected date: total member check-ins, total PT sessions conducted, new memberships sold, membership renewals, total revenue (memberships + paid PT sessions), peak hour attendance (which time slots had most activity).


async getDailySummary(date: string) {

  // 1. Check-ins
  const checkIns = await this.db.query(
    `SELECT COUNT(*) as total_checkins
     FROM attendance
     WHERE attendance_date = ? AND deleted_at IS NULL`,
    [date],
  );

  // 2. PT sessions summary
  const sessions = await this.db.query(
    `SELECT status, COUNT(*) as count
     FROM pt_sessions
     WHERE session_date = ? AND deleted_at IS NULL
     GROUP BY status`,
    [date],
  );

  // 3. PT revenue
  const ptRevenue = await this.db.query(
    `SELECT COALESCE(SUM(amount_charged), 0) as total_pt_revenue
     FROM pt_sessions
     WHERE session_date = ?
     AND status != 'CANCELLED'
     AND deleted_at IS NULL`,
    [date],
  );

  // 4. Membership revenue
  const membershipRevenue = await this.db.query(
    `SELECT COALESCE(SUM(amount), 0) as total_membership_revenue
     FROM membership_transactions
     WHERE DATE(created_at) = ?
     AND status = 'SUCCESS'`,
    [date],
  );

  // 5. New memberships
  const newMembers = await this.db.query(
    `SELECT COUNT(*) as new_memberships
     FROM membership_transactions
     WHERE transaction_type = 'NEW'
     AND DATE(created_at) = ?`,
    [date],
  );

  // 6. Renewals
  const renewals = await this.db.query(
    `SELECT COUNT(*) as renewals
     FROM membership_transactions
     WHERE transaction_type = 'RENEWAL'
     AND DATE(created_at) = ?`,
    [date],
  );

  // 7. Peak hours
  const peakHours = await this.db.query(
    `SELECT HOUR(check_in_time) as hour, COUNT(*) as count
     FROM attendance
     WHERE attendance_date = ?
     AND deleted_at IS NULL
     GROUP BY HOUR(check_in_time)
     ORDER BY count DESC
     LIMIT 5`,
    [date],
  );

  const totalRevenue =
    Number(ptRevenue[0].total_pt_revenue) +
    Number(membershipRevenue[0].total_membership_revenue);

  return {
    date,
    totalCheckIns: checkIns[0].total_checkins,
    sessions,
    newMemberships: newMembers[0].new_memberships,
    renewals: renewals[0].renewals,
    totalRevenue,
    breakdown: {
      ptRevenue: ptRevenue[0].total_pt_revenue,
      membershipRevenue: membershipRevenue[0].total_membership_revenue,
    },
    peakHours,
  };
}

//  Report 2 — Membership Status Report
// Member name, ID, phone, plan, start/end dates
// Days remaining — your SQL must calculate this
// Remaining PT sessions
// Flag EXPIRING SOON if days_remaining < 7 — use CASE WHEN
// Sort by earliest expiry first

  async getMembershipStatus() {
    const members = await this.db.query<{
      id: number;
      member_code: string;
      name: string;
      plan_name: string;
      status: string;
      end_date: string;
      days_remaining: number;
      urgency: string;
    }>(
      `SELECT
        m.id, m.member_code, m.name, mp.name as plan_name, m.status, m.end_date,
        DATEDIFF(m.end_date, CURDATE()) as days_remaining,
        CASE
          WHEN DATEDIFF(m.end_date, CURDATE()) < 0 THEN 'EXPIRED'
          WHEN DATEDIFF(m.end_date, CURDATE()) <= 7 THEN 'EXPIRING_SOON'
          ELSE 'OK'
        END as urgency
       FROM members m
       LEFT JOIN membership_plans mp ON m.membership_plan_id = mp.id
       WHERE m.deleted_at IS NULL AND m.status = 'ACTIVE'
       ORDER BY days_remaining ASC`,
    );

    const expiringSoon = members.filter((m) => m.urgency === 'EXPIRING_SOON');

    return {
      totalActive: members.length,
      expiringSoonCount: expiringSoon.length,
      members,
    };
  }

// Report 3 — Trainer Utilisation Report
// Trainer name, specialisation
// Total sessions conducted this month
// Total available vs booked slots
// No-show count
// Utilisation rate (booked/available × 100) — use NULLIF
// Total revenue from paid sessions
// Commission earned (revenue × commission_rate/100) — SQL arithmetic
// Sort by highest utilisation

  async getTrainerUtilisation(startDate: string, endDate: string) {
    return this.db.query<{
      trainer_id: number;
      trainer_name: string;
      specialization: string;
      total_slots: number;
      booked_slots: number;
      completed_sessions: number;
      no_shows: number;
      utilisation_rate: number;
      total_revenue: number;
      commission: number;
    }>(
      `SELECT
        t.id as trainer_id,
        u.name as trainer_name,
        t.specialization,
        COUNT(DISTINCT ts.id) as total_slots,
        SUM(CASE WHEN ts.status = 'BOOKED' THEN 1 ELSE 0 END) as booked_slots,
        SUM(CASE WHEN ps.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_sessions,
        SUM(CASE WHEN ps.status = 'NO_SHOW' THEN 1 ELSE 0 END) as no_shows,
        ROUND(
          (SUM(CASE WHEN ts.status = 'BOOKED' THEN 1 ELSE 0 END) / NULLIF(COUNT(DISTINCT ts.id), 0)) * 100, 2
        ) as utilisation_rate,
        COALESCE(SUM(CASE WHEN ps.status = 'COMPLETED' THEN ps.amount_charged ELSE 0 END), 0) as total_revenue,
        ROUND(
          COALESCE(SUM(CASE WHEN ps.status = 'COMPLETED' THEN ps.amount_charged ELSE 0 END), 0)
          * t.commission_rate / 100, 2
        ) as commission
       FROM trainers t
       JOIN users u ON t.user_id = u.id
       LEFT JOIN trainer_time_slots ts ON t.id = ts.trainer_id
         AND ts.slot_date BETWEEN ? AND ?
         AND ts.deleted_at IS NULL
       LEFT JOIN pt_sessions ps ON t.id = ps.trainer_id
         AND ps.session_date BETWEEN ? AND ?
         AND ps.deleted_at IS NULL
       WHERE t.deleted_at IS NULL
       GROUP BY t.id, u.name, t.specialization, t.commission_rate
       ORDER BY utilisation_rate DESC`,
      [startDate, endDate, startDate, endDate],
    );
  }

//  Report 4 — Revenue Analysis Report
// Membership sales grouped by plan type with SUM(price)
// Total membership revenue, total paid PT session revenue
// Most popular plan (highest bookings) — use window function or subquery
// Most popular PT specialisation by booking count
// Month-over-month growth — use LAG() window function or self-JOIN on previous month

  async getRevenueAnalysis(startDate: string, endDate: string) {
    // Monthly revenue with growth using LAG()
    const monthlyRevenue = await this.db.query<{
      month: string;
      revenue: number;
      prev_revenue: number | null;
      growth_pct: number | null;
    }>(
      `SELECT
        month,
        revenue,
        LAG(revenue) OVER (ORDER BY month) as prev_revenue,
        ROUND(
          ((revenue - LAG(revenue) OVER (ORDER BY month)) /
          NULLIF(LAG(revenue) OVER (ORDER BY month), 0)) * 100, 2
        ) as growth_pct
       FROM (
         SELECT
           DATE_FORMAT(mt.start_date, '%Y-%m') as month,
           SUM(mt.amount) as revenue
         FROM membership_transactions mt
         WHERE mt.start_date BETWEEN ? AND ?
           AND mt.status = 'SUCCESS'
           AND mt.deleted_at IS NULL
         GROUP BY DATE_FORMAT(mt.start_date, '%Y-%m')
       ) monthly
       ORDER BY month`,
      [startDate, endDate],
    );

    // PT session revenue
    const ptRevenue = await this.db.query<{ total_pt_revenue: number }>(
      `SELECT COALESCE(SUM(amount_charged), 0) as total_pt_revenue
       FROM pt_sessions
       WHERE session_date BETWEEN ? AND ?
         AND status = 'COMPLETED'
         AND deleted_at IS NULL`,
      [startDate, endDate],
    );

    // Most popular plan
    const popularPlan = await this.db.query<{
      plan_name: string;
      total_subscriptions: number;
      total_revenue: number;
    }>(
      `SELECT
        mp.name as plan_name,
        COUNT(*) as total_subscriptions,
        SUM(mt.amount) as total_revenue
       FROM membership_transactions mt
       JOIN membership_plans mp ON mt.plan_id = mp.id
       WHERE mt.start_date BETWEEN ? AND ?
         AND mt.status = 'SUCCESS'
         AND mt.deleted_at IS NULL
       GROUP BY mp.name
       ORDER BY total_subscriptions DESC
       LIMIT 1`,
      [startDate, endDate],
    );

    return {
      monthlyRevenue,
      ptRevenue: ptRevenue[0].total_pt_revenue,
      mostPopularPlan: popularPlan.length > 0 ? popularPlan[0] : null,
    };
  }
}
