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
    const [startHour] =
      startTime
        .split(':')
        .map(Number);

    let [endHour] =
      endTime
        .split(':')
        .map(Number);

    if (
      endTime === '00:00'
    ) {
      endHour = 24;
    }

    if (
      startHour < 6
    ) {
      throw new BadRequestException(
        'Booking cannot start before 6:00 AM.',
      );
    }

    if (
      startHour >= endHour
    ) {
      throw new BadRequestException(
        'End time must be later than start time.',
      );
    }

    const slots: string[] = [];

    for (
      let hour = startHour;
      hour < endHour;
      hour++
    ) {
      slots.push(
        `${hour
          .toString()
          .padStart(
            2,
            '0',
          )}:00`,
      );
    }

    return slots;
  }

  private isCourtTimeAllowed(
    courtId: string,
    startTime: string,
  ): boolean {
    const hour =
      Number(
        startTime.split(
          ':',
        )[0],
      );

    /*
     * BOTH COURTS
     * 6 AM - 9 AM
     *
     * 6-7
     * 7-8
     * 8-9
     */
    if (
      hour >= 6 &&
      hour < 9
    ) {
      return true;
    }

    /*
     * BOTH COURTS CLOSED
     * 9 AM - 4 PM
     */
    if (
      hour >= 9 &&
      hour < 16
    ) {
      return false;
    }

    /*
     * COURT 1
     * 4 PM - 6 PM only
     */
    if (
      courtId === 'court-1'
    ) {
      return (
        hour >= 16 &&
        hour < 18
      );
    }

    /*
     * COURT 2
     * 4 PM - 12 AM
     */
    if (
      courtId === 'court-2'
    ) {
      return (
        hour >= 16 &&
        hour < 24
      );
    }

    return false;
  }

  private calculatePricing(
    courtIds: string[],
    requestedSlots: string[],
  ) {
    let daytimeHours = 0;
    let eveningHours = 0;

    for (
      const time
      of requestedSlots
    ) {
      const hour =
        Number(
          time.split(
            ':',
          )[0],
        );

      /*
       * 6 AM - 5 PM
       * ₱250/hour/court
       */
      if (
        hour >= 6 &&
        hour < 17
      ) {
        daytimeHours++;
      } else {
        /*
         * 5 PM onwards
         * ₱300/hour/court
         */
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
        hours:
          daytimeHours,

        ratePerCourtPerHour:
          daytimeRate,

        subtotal:
          daytimeSubtotal,
      },

      evening: {
        hours:
          eveningHours,

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

  async create(
    dto: CreateBookingDto,
  ) {
    const db =
      this.firebaseService.firestore;

    const requestedSlots =
      this.generateHourlySlots(
        dto.startTime,
        dto.endTime,
      );

    /*
     * Check permanent court schedule.
     */
    const invalidSlot =
      dto.courtIds
        .flatMap(
          (courtId) =>
            requestedSlots.map(
              (time) => ({
                courtId,
                time,
              }),
            ),
        )
        .find(
          ({
            courtId,
            time,
          }) =>
            !this.isCourtTimeAllowed(
              courtId,
              time,
            ),
        );

    if (invalidSlot) {
      throw new BadRequestException(
        `${invalidSlot.courtId} is not available at ${invalidSlot.time}.`,
      );
    }

    /*
     * Calculate full court fee.
     */
    const pricing =
      this.calculatePricing(
        dto.courtIds,
        requestedSlots,
      );

    /*
     * Security deposit.
     *
     * This is NOT an extra fee.
     * It is deducted from the
     * total court fee.
     */
    const securityDeposit = 100;

    const remainingBalance =
      Math.max(
        pricing.totalPrice -
          securityDeposit,
        0,
      );

    const bookingRef =
      db
        .collection(
          'bookings',
        )
        .doc();

    const reference =
      'PP-' +
      Math.random()
        .toString(36)
        .substring(
          2,
          8,
        )
        .toUpperCase();

    await db.runTransaction(
      async (
        transaction,
      ) => {
        const slotRefs =
          dto.courtIds
            .flatMap(
              (
                courtId,
              ) =>
                requestedSlots.map(
                  (
                    time,
                  ) => {
                    const slotId =
                      `${courtId}_${dto.date}_${time}`
                        .replace(
                          ':',
                          '-',
                        );

                    return {
                      courtId,
                      time,

                      ref:
                        db
                          .collection(
                            'bookingSlots',
                          )
                          .doc(
                            slotId,
                          ),
                    };
                  },
                ),
            );

        const slotSnapshots =
          await Promise.all(
            slotRefs.map(
              ({
                ref,
              }) =>
                transaction.get(
                  ref,
                ),
            ),
          );

        const hasConflict =
          slotSnapshots.some(
            (
              snapshot,
            ) =>
              snapshot.exists,
          );

        if (
          hasConflict
        ) {
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

          /*
           * Booking is pending
           * until deposit is verified.
           */
          status:
            'PENDING',

          /*
           * Payment/deposit details
           */
          securityDeposit,

          depositStatus:
            'UNPAID',

          remainingBalance,

          /*
           * Full court pricing
           */
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

      securityDeposit,

      depositStatus:
        'UNPAID',

      remainingBalance,

      pricing,

      totalPrice:
        pricing.totalPrice,

      message:
        'Booking request submitted successfully. Please pay the ₱100 security deposit. The deposit will be deducted from the total court fee.',
    };
  }
}