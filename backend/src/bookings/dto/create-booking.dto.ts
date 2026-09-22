import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @ArrayUnique()
  @IsIn(['court-1', 'court-2'], {
    each: true,
  })
  courtIds: string[];

  @IsString()
  @IsNotEmpty()
  date: string;

  @Matches(/^([01]\d|2[0-3]):00$/)
  startTime: string;

  @Matches(/^([01]\d|2[0-3]|00):00$/)
  endTime: string;

  @IsOptional()
  @IsString()
  notes?: string;
}