import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';
import { ResultSetHeader } from 'mysql2';
import { CronQueries } from './queries/cron.queries';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(private db: DatabaseService) {}

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
    }>(CronQueries.CHECK_EXPIRING_MEMBERSHIPS);

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

  @Cron('30 23 * * *')
async dailySummaryAndExpiry() {
  this.logger.log('Running: Daily summary and membership expiry check');

    const expired = await this.db.execute<ResultSetHeader>(
      CronQueries.AUTO_EXPIRE_MEMBERSHIPS,
    );

  this.logger.log(`Auto-expired ${expired.affectedRows} memberships`);

  const today = new Date().toISOString().split('T')[0];

    const attendance = await this.db.query<{ total: number }>(
      CronQueries.DAILY_TOTAL_CHECKINS,
      [today],
    );

    const sessions = await this.db.query<{ total: number }>(
      CronQueries.DAILY_COMPLETED_SESSIONS,
      [today],
    );

    const ptRevenue = await this.db.query<{ total: number }>(
      CronQueries.DAILY_PT_REVENUE,
      [today],
    );

    const membershipRevenue = await this.db.query<{ total: number }>(
      CronQueries.DAILY_MEMBERSHIP_REVENUE,
      [today],
    );

  const totalRevenue =
    ptRevenue[0].total + membershipRevenue[0].total;

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
