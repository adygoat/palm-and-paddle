import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { AdminService } from './admin.service';
import { BlockCourtDto } from './dto/block-court.dto';
import { BulkBlockCourtDto } from './dto/bulk-block-court.dto';

@Controller('admin/bookings')
@UseGuards(AdminAuthGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
  ) {}

  @Get()
  getAllBookings() {
    return this.adminService.getAllBookings();
  }

  @Get('schedule')
  getCourtSchedule(
    @Query('courtId')
    courtId: string,

    @Query('date')
    date: string,
  ) {
    if (!courtId || !date) {
      throw new BadRequestException(
        'courtId and date are required.',
      );
    }

    return this.adminService.getCourtSchedule(
      courtId,
      date,
    );
  }

  @Post('blocks')
  blockCourt(
    @Body()
    dto: BlockCourtDto,
  ) {
    return this.adminService.blockCourtSlots(
      dto,
    );
  }

  @Delete('blocks')
  unblockCourt(
    @Body()
    dto: BlockCourtDto,
  ) {
    return this.adminService.unblockCourtSlots(
      dto,
    );
  }

  @Post('bulk-blocks')
  bulkBlockCourts(
   @Body()
   dto: BulkBlockCourtDto,
  ) {
    return this.adminService.bulkBlockCourtSlots(
      dto,
    );
  }
  @Delete('bulk-blocks')
  bulkUnblockCourts(
   @Body()
   dto: BulkBlockCourtDto,
 ) {
   return this.adminService
    .bulkUnblockCourtSlots(
      dto,
    );
 }


  @Get(':id')
  getBookingById(
    @Param('id')
    id: string,
  ) {
    return this.adminService.getBookingById(
      id,
    );
  }

  @Patch(':id/confirm')
  confirmBooking(
    @Param('id')
    id: string,
  ) {
    return this.adminService.confirmBooking(
      id,
    );
  }
  @Patch(':id/cancel')
  cancelBooking(
    @Param('id')
    id: string,
  ) {
    return this.adminService.cancelBooking(
      id,
    );
  }

  @Patch(':id/complete')
  completeBooking(
    @Param('id')
    id: string,
  ) {
    return this.adminService.completeBooking(
      id,
    );
  }


}