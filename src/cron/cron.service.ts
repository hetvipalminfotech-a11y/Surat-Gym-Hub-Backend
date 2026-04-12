import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';
import { ResultSetHeader } from 'mysql2';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(private db: DatabaseService) {}

  /**
   * 9 AM Daily: Check for expiring memberships (next 7 days)
   * Logs members whose memberships are about to expire
   */
  @Cron('0 9 * * *')
  async checkExpiringMemberships() {
    this.logger.log('Running: Check expiring memberships');

    const expiringMembers = await this.db.query<{
      id: number;
      member_code: string;
      name: string;
      phone: string;
      end_date: string;
      days_remaining: number;
    }>(
      `SELECT
        m.id, m.member_code, m.name, m.phone, m.end_date,
        DATEDIFF(m.end_date, CURDATE()) as days_remaining
       FROM members m
       WHERE m.status = 'ACTIVE'
         AND m.deleted_at IS NULL
         AND DATEDIFF(m.end_date, CURDATE()) BETWEEN 0 AND 7
       ORDER BY m.end_date ASC`,
    );

    if (expiringMembers.length > 0) {
      this.logger.warn(
        `Found ${expiringMembers.length} memberships expiring in next 7 days:`,
      );
      for (const member of expiringMembers) {
        this.logger.warn(
          `  - ${member.member_code} | ${member.name} | ${member.phone} | Expires: ${member.end_date} (${member.days_remaining} days)`,
        );
      }
    } else {
      this.logger.log('No memberships expiring in next 7 days');
    }
  }

  /**
   * 11:30 PM Daily: Auto-expire memberships and log daily summary
   */
  @Cron('30 23 * * *')
async dailySummaryAndExpiry() {
  this.logger.log('Running: Daily summary and membership expiry check');

  // 1️⃣ Auto-expire memberships
  const expired = await this.db.execute<ResultSetHeader>(
    `UPDATE members 
     SET status = 'EXPIRED'
     WHERE status = 'ACTIVE' 
     AND end_date < CURDATE() 
     AND deleted_at IS NULL`,
  );

  this.logger.log(`Auto-expired ${expired.affectedRows} memberships`);

  const today = new Date().toISOString().split('T')[0];

  // 2️⃣ Total Check-ins
  const attendance = await this.db.query<{ total: number }>(
    `SELECT COUNT(*) as total 
     FROM attendance
     WHERE attendance_date = ? 
     AND deleted_at IS NULL`,
    [today],
  );

  // 3️⃣ Total PT sessions conducted (ONLY COMPLETED)
  const sessions = await this.db.query<{ total: number }>(
    `SELECT COUNT(*) as total 
     FROM pt_sessions
     WHERE session_date = ? 
     AND status = 'COMPLETED'
     AND deleted_at IS NULL`,
    [today],
  );

  // 4️⃣ PT revenue (ONLY COMPLETED)
  const ptRevenue = await this.db.query<{ total: number }>(
    `SELECT COALESCE(SUM(amount_charged), 0) as total 
     FROM pt_sessions
     WHERE session_date = ? 
     AND status = 'COMPLETED'
     AND deleted_at IS NULL`,
    [today],
  );

  // 5️⃣ Membership revenue
  const membershipRevenue = await this.db.query<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total 
     FROM membership_transactions
     WHERE DATE(created_at) = ? 
     AND status = 'SUCCESS'
     AND deleted_at IS NULL`,
    [today],
  );

  const totalRevenue =
    ptRevenue[0].total + membershipRevenue[0].total;

  // 6️⃣ LOG FINAL REPORT
  this.logger.log('===== DAILY REPORT =====');
  this.logger.log(`Date: ${today}`);
  this.logger.log(`Total Check-ins: ${attendance[0].total}`);
  this.logger.log(`PT Sessions Conducted: ${sessions[0].total}`);
  this.logger.log(`PT Revenue: ₹${ptRevenue[0].total}`);
  this.logger.log(`Membership Revenue: ₹${membershipRevenue[0].total}`);
  this.logger.log(`Total Revenue: ₹${totalRevenue}`);
  this.logger.log('========================');
}
}
