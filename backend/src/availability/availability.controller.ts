import {
  BadRequestException,
  Controller,
  Get,
  Query,
} from '@nestjs/common';

import { AvailabilityService } from './availability.service';

@Controller('availability')
export class AvailabilityController {
  constructor(
    private readonly availabilityService: AvailabilityService,
  ) {}

  @Get()
  getAvailability(
    @Query('courtId') courtId: string,
    @Query('date') date: string,
  ) {
    if (!courtId || !date) {
      throw new BadRequestException(
        'courtId and date are required.',
      );
    }

    return this.availabilityService.getAvailability(
      courtId,
      date,
    );
  }
}