import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class BlockCourtDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @ArrayUnique()
  @IsIn(['court-1', 'court-2'], {
    each: true,
  })
  courtIds: string[];

  @IsString()
  date: string;

  @Matches(/^([01]\d|2[0-3]):00$/)
  startTime: string;

  @Matches(/^([01]\d|2[0-3]|00):00$/)
  endTime: string;

  @IsOptional()
  @IsString()
  reason?: string;
}