import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('reports')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily-summary')
  async getDailySummary(@Query('date') date: string) {
    const reportDate = date || new Date().toISOString().split('T')[0];
    return this.reportsService.getDailySummary(reportDate);
  }

  @Get('membership-status')
  async getMembershipStatus() {
    return this.reportsService.getMembershipStatus();
  }

  @Get('trainer-utilisation')
  async getTrainerUtilisation(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getTrainerUtilisation(startDate, endDate);
  }

  @Get('revenue')
  async getRevenueAnalysis(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getRevenueAnalysis(startDate, endDate);
  }
}
