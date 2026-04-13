import {
  Controller,
  Get,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // ==============================
  // 📊 Report 1 — Daily Summary
  // ==============================
  @Get('daily-summary')
  async getDailySummary(@Query('date') date: string) {
    if (!date) {
      throw new BadRequestException('date is required (YYYY-MM-DD)');
    }

    return this.reportsService.getDailySummary(date);
  }

  // ==============================
  // 📊 Report 2 — Membership Expiry
  // ==============================
  @Get('membership-expiry')
  async getMembershipExpiry() {
    return this.reportsService.getMembershipExpiryReport();
  }

  // ==============================
  // 📊 Report 3 — Trainer Utilisation
  // ==============================
  @Get('trainer-utilisation')
  async getTrainerUtilisation() {
    return this.reportsService.getTrainerUtilisationReport();
  }

  // ==============================
  // 📊 Report 4 — Revenue Analysis
  // ==============================
  @Get('revenue-analysis')
  async getRevenueAnalysis() {
    return this.reportsService.getRevenueAnalysisReport();
  }
}