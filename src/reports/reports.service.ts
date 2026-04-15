import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { loadSQLQueries } from './utils/sql-loader';
import {
  DailySummaryReport,
  MembershipExpiryReport,
  TrainerUtilisationReport,
  RevenueAnalysisReport,
} from './reports.types';

@Injectable()
export class ReportsService {
  private queries: Record<string, string>;

  constructor(private readonly db: DatabaseService) {
    this.queries = loadSQLQueries('src/reports/sqlqueries/reports.queries.sql');
  }

  async getDailySummary(date: string): Promise<DailySummaryReport[]> {
    return this.db.query<DailySummaryReport>(
      this.queries.getDailySummary,
      [date, date, date, date],
    );
  }

  async getMembershipExpiryReport(): Promise<MembershipExpiryReport[]> {
    return this.db.query<MembershipExpiryReport>(
      this.queries.getMembershipExpiryReport,
    );
  }

  async getTrainerUtilisationReport(): Promise<TrainerUtilisationReport[]> {
    return this.db.query<TrainerUtilisationReport>(
      this.queries.getTrainerUtilisationReport,
    );
  }

  async getRevenueAnalysisReport(): Promise<RevenueAnalysisReport[]> {
    return this.db.query<RevenueAnalysisReport>(
      this.queries.getRevenueAnalysisReport,
    );
  }
}
