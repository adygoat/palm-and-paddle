import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';

import { FirebaseService } from '../firebase/firebase.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class BookingsService {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly mailService: MailService,
  ) {}

  private generateHourlySlots(
    startTime: string,
    endTime: string,
  ): string[] {
    const [startHour] = startTime.split(':').map(Number);

    let [endHour] = endTime.split(':').map(Number);

    if (endTime === '00:00') {
      endHour = 24;
    }

    if (startHour < 6) {
      throw new BadRequestException(
        'Booking cannot start before 6:00 AM.',
      );
    }

    if (startHour >= endHour) {
      throw new BadRequestException(
        'End time must be later than start time.',
      );
    }

    const slots: string[] = [];

    for (let hour = startHour; hour < endHour; hour++) {
      slots.push(
        `${hour.toString().padStart(2, '0')}:00`,
      );
    }

    return slots;
  }

  private calculatePricing(
    courtIds: string[],
    requestedSlots: string[],
  ) {
    let daytimeHours = 0;
    let eveningHours = 0;

    for (const time of requestedSlots) {
      const hour = Number(
        time.split(':')[0],
      );

      if (hour >= 6 && hour < 18) {
        daytimeHours++;
      } else {
        eveningHours++;
      }
    }

    const courtCount =
      courtIds.length;

    const daytimeRate = 250;
    const eveningRate = 300;

    const daytimeSubtotal =
      daytimeHours *
      daytimeRate *
      courtCount;

    const eveningSubtotal =
      eveningHours *
      eveningRate *
      courtCount;

    return {
      courtCount,

      daytime: {
        hours: daytimeHours,
        ratePerCourtPerHour:
          daytimeRate,
        subtotal:
          daytimeSubtotal,
      },

      evening: {
        hours: eveningHours,
        ratePerCourtPerHour:
          eveningRate,
        subtotal:
          eveningSubtotal,
      },

      totalHours:
        requestedSlots.length,

      totalPrice:
        daytimeSubtotal +
        eveningSubtotal,
    };
  }

  async create(dto: CreateBookingDto) {
    const db =
      this.firebaseService.firestore;

    const requestedSlots =
      this.generateHourlySlots(
        dto.startTime,
        dto.endTime,
      );

    const pricing =
      this.calculatePricing(
        dto.courtIds,
        requestedSlots,
      );

    const bookingRef =
      db
        .collection('bookings')
        .doc();

    const reference =
      'PP-' +
      Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

    await db.runTransaction(
      async (transaction) => {
        const slotRefs =
          dto.courtIds.flatMap(
            (courtId) =>
              requestedSlots.map(
                (time) => {
                  const slotId =
                    `${courtId}_${dto.date}_${time}`.replace(
                      ':',
                      '-',
                    );

                  return {
                    courtId,
                    time,

                    ref: db
                      .collection(
                        'bookingSlots',
                      )
                      .doc(slotId),
                  };
                },
              ),
          );

        const slotSnapshots =
          await Promise.all(
            slotRefs.map(
              ({ ref }) =>
                transaction.get(ref),
            ),
          );

        const hasConflict =
          slotSnapshots.some(
            (snapshot) =>
              snapshot.exists,
          );

        if (hasConflict) {
          throw new ConflictException(
            'One or more selected courts are already booked during the requested time.',
          );
        }

        const bookingData = {
          customerName:
            dto.customerName,

          email:
            dto.email,

          phone:
            dto.phone,

          courtIds:
            dto.courtIds,

          date:
            dto.date,

          startTime:
            dto.startTime,

          endTime:
            dto.endTime,

          reference,

          status:
            'PENDING',

          pricing,

          totalPrice:
            pricing.totalPrice,

          createdAt:
            new Date(),

          ...(dto.notes
            ? {
                notes:
                  dto.notes,
              }
            : {}),
        };

        transaction.set(
          bookingRef,
          bookingData,
        );

        slotRefs.forEach(
          ({
            ref,
            courtId,
            time,
          }) => {
            transaction.set(
              ref,
              {
                bookingId:
                  bookingRef.id,

                courtId,

                date:
                  dto.date,

                startTime:
                  time,
              },
            );
          },
        );
      },
    );

    await this.mailService
      .sendNewBookingNotification(
        {
          reference,

          customerName:
            dto.customerName,

          email:
            dto.email,

          phone:
            dto.phone,

          courtIds:
            dto.courtIds,

          date:
            dto.date,

          startTime:
            dto.startTime,

          endTime:
            dto.endTime,

          totalPrice:
            pricing.totalPrice,

          notes:
            dto.notes,
        },
      );

    return {
      id:
        bookingRef.id,

      reference,

      status:
        'PENDING',

      courtIds:
        dto.courtIds,

      pricing,

      totalPrice:
        pricing.totalPrice,

      message:
        'Booking request submitted successfully.',
    };
  }
}