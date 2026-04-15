import {
  Controller,
  Get,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import {
  DailySummaryReport,
  MembershipExpiryReport,
  TrainerUtilisationReport,
  RevenueAnalysisReport,
} from './reports.types';

@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily-summary')
  async getDailySummary(@Query('date') date: string): Promise<DailySummaryReport[]> {
    if (!date) {
      throw new BadRequestException('date is required (YYYY-MM-DD)');
    }

    return this.reportsService.getDailySummary(date);
  }

  @Get('membership-expiry')
  async getMembershipExpiry(): Promise<MembershipExpiryReport[]> {
    return this.reportsService.getMembershipExpiryReport();
  }

  @Get('trainer-utilisation')
  async getTrainerUtilisation(): Promise<TrainerUtilisationReport[]> {
    return this.reportsService.getTrainerUtilisationReport();
  }

  @Get('revenue-analysis')
  async getRevenueAnalysis(): Promise<RevenueAnalysisReport[]> {
    return this.reportsService.getRevenueAnalysisReport();
  }
}
