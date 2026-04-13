import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { loadSQLQueries } from './utils/sql-loader';

@Injectable()
export class ReportsService {
  private queries: Record<string, string>;

  constructor(private readonly db: DatabaseService) {
    this.queries = loadSQLQueries('src/reports/sqlqueries/reports.queries.sql');
  }

  // ✅ Report 1
  async getDailySummary(date: string) {
    return this.db.query(
    this.queries.getDailySummary,
    [date, date, date, date],
  );
  }

  // ✅ Report 2
  async getMembershipExpiryReport() {
    const [rows] = await this.db.pool.execute(
      this.queries.getMembershipExpiryReport,
    );
    return rows;
  }

  // ✅ Report 3
  async getTrainerUtilisationReport() {
    const [rows] = await this.db.pool.execute(
      this.queries.getTrainerUtilisationReport,
    );
    return rows;
  }

  // ✅ Report 4
  async getRevenueAnalysisReport() {
    const [rows] = await this.db.pool.execute(
      this.queries.getRevenueAnalysisReport,
    );
    return rows;
  }
}
