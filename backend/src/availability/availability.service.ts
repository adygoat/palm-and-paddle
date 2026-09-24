import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly firebaseService: FirebaseService,
  ) { }

  private isCourtTimeAllowed(
    courtId: string,
    startTime: string,
  ): boolean {
    const hour = Number(
      startTime.split(':')[0],
    );

    // Both courts: 6 AM - 9 AM
    if (
      hour >= 6 &&
      hour < 9
    ) {
      return true;
    }

    // Both courts closed: 9 AM - 4 PM
    if (
      hour >= 9 &&
      hour < 16
    ) {
      return false;
    }

    // Court 1: 4 PM - 6 PM only
    if (
      courtId === 'court-1'
    ) {
      return (
        hour >= 16 &&
        hour < 18
      );
    }

    // Court 2: 4 PM - 12 AM
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

  private isPastSlotManila(
    date: string,
    startTime: string,
  ): boolean {
    /*
     * Explicit +08:00 = Manila / Philippine time.
     *
     * Example:
     * 2026-09-24T16:00:00+08:00
     */
    const slotStart =
      new Date(
        `${date}T${startTime}:00+08:00`,
      );

    const now =
      new Date();

    return (
      slotStart.getTime() <=
      now.getTime()
    );
  }

  async getAvailability(
    courtId: string,
    date: string,
  ) {
    try {
      const db =
        this.firebaseService.firestore;

      const snapshot =
        await db
          .collection(
            'bookingSlots',
          )
          .where(
            'courtId',
            '==',
            courtId,
          )
          .where(
            'date',
            '==',
            date,
          )
          .get();

      const bookedTimes =
        snapshot.docs.map(
          (doc) =>
            doc.data()
              .startTime,
        );

      const slots = [
        { startTime: '06:00', endTime: '07:00' },
        { startTime: '07:00', endTime: '08:00' },
        { startTime: '08:00', endTime: '09:00' },
        { startTime: '09:00', endTime: '10:00' },
        { startTime: '10:00', endTime: '11:00' },
        { startTime: '11:00', endTime: '12:00' },
        { startTime: '12:00', endTime: '13:00' },
        { startTime: '13:00', endTime: '14:00' },
        { startTime: '14:00', endTime: '15:00' },
        { startTime: '15:00', endTime: '16:00' },
        { startTime: '16:00', endTime: '17:00' },
        { startTime: '17:00', endTime: '18:00' },
        { startTime: '18:00', endTime: '19:00' },
        { startTime: '19:00', endTime: '20:00' },
        { startTime: '20:00', endTime: '21:00' },
        { startTime: '21:00', endTime: '22:00' },
        { startTime: '22:00', endTime: '23:00' },
        { startTime: '23:00', endTime: '00:00' },
      ];

      return {
        courtId,
        date,

        slots:
          slots.map(
            (slot) => {
              const allowed =
                this.isCourtTimeAllowed(
                  courtId,
                  slot.startTime,
                );

              const booked =
                bookedTimes.includes(
                  slot.startTime,
                );

              const past =
                this.isPastSlotManila(
                  date,
                  slot.startTime,
                );

              return {
                ...slot,

                available:
                  allowed &&
                  !booked &&
                  !past,

                reason:
                  past
                    ? 'PAST'
                    : !allowed
                      ? 'CLOSED'
                      : booked
                        ? 'BOOKED'
                        : null,
              };
            },
          ),
      };
    } catch (error) {
      console.error(
        'Availability Firestore error:',
        error,
      );

      throw error;
    }
  }
}