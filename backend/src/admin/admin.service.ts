import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { FirebaseService } from '../firebase/firebase.service';
import { MailService } from '../mail/mail.service';
import { DocumentReference } from 'firebase-admin/firestore';

@Injectable()
export class AdminService {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly mailService: MailService,
  ) { }

  async getAllBookings() {
    const db = this.firebaseService.firestore;

    const snapshot = await db
      .collection('bookings')
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  async getCourtSchedule(
    courtId: string,
    date: string,
  ) {
    const db = this.firebaseService.firestore;

    const snapshot = await db
      .collection('bookingSlots')
      .where('courtId', '==', courtId)
      .where('date', '==', date)
      .get();

    const occupiedSlots = new Map<
      string,
      'BOOKED' | 'BLOCKED'
    >();

    snapshot.docs.forEach((doc) => {
      const data = doc.data();

      occupiedSlots.set(
        data.startTime,
        data.type === 'MANUAL_BLOCK'
          ? 'BLOCKED'
          : 'BOOKED',
      );
    });

    const slots = [];

    for (let hour = 6; hour < 24; hour++) {
      const startTime =
        `${hour.toString().padStart(2, '0')}:00`;

      const nextHour = hour + 1;

      const endTime =
        nextHour === 24
          ? '00:00'
          : `${nextHour
            .toString()
            .padStart(2, '0')}:00`;

      slots.push({
        startTime,
        endTime,
        status:
          occupiedSlots.get(startTime) ??
          'OPEN',
      });
    }

    return {
      courtId,
      date,
      slots,
    };
  }

  async getBookingById(id: string) {
    const db = this.firebaseService.firestore;

    const bookingRef = db
      .collection('bookings')
      .doc(id);

    const bookingSnapshot =
      await bookingRef.get();

    if (!bookingSnapshot.exists) {
      throw new NotFoundException(
        'Booking not found.',
      );
    }

    return {
      id: bookingSnapshot.id,
      ...bookingSnapshot.data(),
    };
  }

  async verifyDeposit(id: string) {
    const db =
      this.firebaseService.firestore;

    const bookingRef =
      db
        .collection('bookings')
        .doc(id);

    const bookingSnapshot =
      await bookingRef.get();

    if (!bookingSnapshot.exists) {
      throw new NotFoundException(
        'Booking not found.',
      );
    }

    const booking =
      bookingSnapshot.data();

    if (!booking) {
      throw new NotFoundException(
        'Booking data not found.',
      );
    }

    if (
      booking.status === 'CANCELLED'
    ) {
      throw new BadRequestException(
        'Cancelled booking cannot have its deposit verified.',
      );
    }

    if (
      booking.status === 'COMPLETED'
    ) {
      throw new BadRequestException(
        'Completed booking cannot have its deposit verified.',
      );
    }

    if (
      booking.depositStatus === 'VERIFIED'
    ) {
      throw new BadRequestException(
        'Security deposit is already verified.',
      );
    }

    const securityDeposit =
      booking.securityDeposit ?? 100;

    const remainingBalance =
      Math.max(
        (booking.totalPrice ?? 0) -
        securityDeposit,
        0,
      );

    await bookingRef.update({
      depositStatus:
        'VERIFIED',

      depositPaidAmount:
        securityDeposit,

      depositVerifiedAt:
        new Date(),

      remainingBalance,

      /*
       * Once the ₱100 payment
       * is verified, the booking
       * becomes confirmed.
       */
      status:
        'CONFIRMED',

      updatedAt:
        new Date(),
    });

    await this.mailService
      .sendBookingConfirmedEmail({
        reference:
          booking.reference,

        customerName:
          booking.customerName,

        email:
          booking.email,

        courtIds:
          booking.courtIds,

        date:
          booking.date,

        startTime:
          booking.startTime,

        endTime:
          booking.endTime,

        totalPrice:
          booking.totalPrice,
      });

    return {
      id,

      status:
        'CONFIRMED',

      depositStatus:
        'VERIFIED',

      securityDeposit,

      remainingBalance,

      message:
        'Security deposit verified. Booking confirmed and customer notified.',
    };
  }

  async confirmBooking(id: string) {
    const db = this.firebaseService.firestore;

    const bookingRef = db
      .collection('bookings')
      .doc(id);

    const bookingSnapshot =
      await bookingRef.get();

    if (!bookingSnapshot.exists) {
      throw new NotFoundException(
        'Booking not found.',
      );
    }

    const booking =
      bookingSnapshot.data();

    if (!booking) {
      throw new NotFoundException(
        'Booking data not found.',
      );
    }

    if (
      booking.status ===
      'CANCELLED'
    ) {
      throw new BadRequestException(
        'Cancelled booking cannot be confirmed.',
      );
    }

    if (
      booking.status ===
      'COMPLETED'
    ) {
      throw new BadRequestException(
        'Completed booking cannot be confirmed.',
      );
    }

    if (
      booking.status ===
      'CONFIRMED'
    ) {
      throw new BadRequestException(
        'Booking is already confirmed.',
      );
    }

    await bookingRef.update({
      status: 'CONFIRMED',
      updatedAt: new Date(),
    });

    await this.mailService
      .sendBookingConfirmedEmail({
        reference:
          booking.reference,

        customerName:
          booking.customerName,

        email:
          booking.email,

        courtIds:
          booking.courtIds,

        date:
          booking.date,

        startTime:
          booking.startTime,

        endTime:
          booking.endTime,

        totalPrice:
          booking.totalPrice,
      });

    return {
      id,
      status: 'CONFIRMED',
      message:
        'Booking confirmed successfully and customer notified.',
    };
  }

  async completeBooking(id: string) {
    const db = this.firebaseService.firestore;

    const bookingRef = db
      .collection('bookings')
      .doc(id);

    const bookingSnapshot =
      await bookingRef.get();

    if (!bookingSnapshot.exists) {
      throw new NotFoundException(
        'Booking not found.',
      );
    }

    const booking =
      bookingSnapshot.data();

    if (!booking) {
      throw new NotFoundException(
        'Booking data not found.',
      );
    }

    if (booking.depositStatus !== 'VERIFIED') {
      throw new BadRequestException(
        'The ₱100 security deposit must be verified before confirming this booking.',
      );
    }

    if (
      booking.status !==
      'CONFIRMED'
    ) {
      throw new BadRequestException(
        'Only confirmed bookings can be completed.',
      );
    }

    await bookingRef.update({
      status: 'COMPLETED',
      updatedAt: new Date(),
    });

    return {
      id,
      status: 'COMPLETED',
      message:
        'Booking marked as completed.',
    };
  }

  async cancelBooking(id: string) {
    const db = this.firebaseService.firestore;

    const bookingRef = db
      .collection('bookings')
      .doc(id);

    let bookingData: {
      reference: string;
      customerName: string;
      email: string;
      courtIds: string[];
      date: string;
      startTime: string;
      endTime: string;
      totalPrice?: number;
    } | null = null;

    await db.runTransaction(
      async (transaction) => {
        const bookingSnapshot =
          await transaction.get(
            bookingRef,
          );

        if (
          !bookingSnapshot.exists
        ) {
          throw new NotFoundException(
            'Booking not found.',
          );
        }

        const booking =
          bookingSnapshot.data();

        if (!booking) {
          throw new NotFoundException(
            'Booking data not found.',
          );
        }

        if (
          booking.status ===
          'CANCELLED'
        ) {
          throw new BadRequestException(
            'Booking is already cancelled.',
          );
        }

        if (
          booking.status ===
          'COMPLETED'
        ) {
          throw new BadRequestException(
            'Completed booking cannot be cancelled.',
          );
        }

        bookingData = {
          reference:
            booking.reference,

          customerName:
            booking.customerName,

          email:
            booking.email,

          courtIds:
            booking.courtIds,

          date:
            booking.date,

          startTime:
            booking.startTime,

          endTime:
            booking.endTime,

          totalPrice:
            booking.totalPrice,
        };

        const requestedSlots =
          this.generateHourlySlots(
            booking.startTime,
            booking.endTime,
          );

        const slotRefs =
          booking.courtIds.flatMap(
            (courtId: string) =>
              requestedSlots.map(
                (time) => {
                  const slotId =
                    `${courtId}_${booking.date}_${time}`.replace(
                      ':',
                      '-',
                    );

                  return db
                    .collection(
                      'bookingSlots',
                    )
                    .doc(
                      slotId,
                    );
                },
              ),
          );

        transaction.update(
          bookingRef,
          {
            status:
              'CANCELLED',

            updatedAt:
              new Date(),
          },
        );

        slotRefs.forEach(
          (slotRef: DocumentReference) => {
            transaction.delete(
              slotRef,
            );
          },
        );
      },
    );

    if (bookingData) {
      await this.mailService
        .sendBookingCancelledEmail(
          bookingData,
        );
    }

    return {
      id,
      status: 'CANCELLED',
      message:
        'Booking cancelled, time slots released, and customer notified.',
    };
  }

  async blockCourtSlots(dto: {
    courtIds: string[];
    date: string;
    startTime: string;
    endTime: string;
    reason?: string;
  }) {
    const db =
      this.firebaseService.firestore;

    const requestedSlots =
      this.generateHourlySlots(
        dto.startTime,
        dto.endTime,
      );

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

    await db.runTransaction(
      async (transaction) => {
        const snapshots =
          await Promise.all(
            slotRefs.map(
              ({ ref }) =>
                transaction.get(ref),
            ),
          );

        const occupied =
          snapshots.some(
            (snapshot) =>
              snapshot.exists,
          );

        if (occupied) {
          throw new BadRequestException(
            'One or more selected time slots are already booked or blocked.',
          );
        }

        slotRefs.forEach(
          ({
            ref,
            courtId,
            time,
          }) => {
            transaction.set(
              ref,
              {
                type:
                  'MANUAL_BLOCK',

                courtId,

                date:
                  dto.date,

                startTime:
                  time,

                reason:
                  dto.reason ??
                  'Admin block',

                createdAt:
                  new Date(),
              },
            );
          },
        );
      },
    );

    return {
      message:
        'Court time successfully blocked.',

      courtIds:
        dto.courtIds,

      date:
        dto.date,

      startTime:
        dto.startTime,

      endTime:
        dto.endTime,
    };
  }

  async unblockCourtSlots(dto: {
    courtIds: string[];
    date: string;
    startTime: string;
    endTime: string;
  }) {
    const db =
      this.firebaseService.firestore;

    const requestedSlots =
      this.generateHourlySlots(
        dto.startTime,
        dto.endTime,
      );

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

              return db
                .collection(
                  'bookingSlots',
                )
                .doc(slotId);
            },
          ),
      );

    await db.runTransaction(
      async (transaction) => {
        for (
          const slotRef
          of slotRefs
        ) {
          const snapshot =
            await transaction.get(
              slotRef,
            );

          if (
            !snapshot.exists
          ) {
            continue;
          }

          const data =
            snapshot.data();

          /*
           * Never allow admin "unblock"
           * to delete a real customer's
           * booking slot.
           */
          if (
            data?.type !==
            'MANUAL_BLOCK'
          ) {
            throw new BadRequestException(
              'One or more selected slots belong to an actual booking and cannot be manually opened.',
            );
          }
        }

        slotRefs.forEach(
          (slotRef) => {
            transaction.delete(
              slotRef,
            );
          },
        );
      },
    );

    return {
      message:
        'Court time successfully reopened.',

      courtIds:
        dto.courtIds,

      date:
        dto.date,

      startTime:
        dto.startTime,

      endTime:
        dto.endTime,
    };
  }

  async bulkBlockCourtSlots(dto: {
    courtIds: string[];
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    reason?: string;
  }) {
    const db =
      this.firebaseService.firestore;

    const startDate =
      new Date(
        `${dto.startDate}T00:00:00`,
      );

    const endDate =
      new Date(
        `${dto.endDate}T00:00:00`,
      );

    if (
      Number.isNaN(
        startDate.getTime(),
      ) ||
      Number.isNaN(
        endDate.getTime(),
      )
    ) {
      throw new BadRequestException(
        'Invalid date range.',
      );
    }

    if (
      startDate >
      endDate
    ) {
      throw new BadRequestException(
        'Start date cannot be after end date.',
      );
    }

    const requestedSlots =
      this.generateHourlySlots(
        dto.startTime,
        dto.endTime,
      );

    if (
      requestedSlots.length === 0
    ) {
      throw new BadRequestException(
        'Invalid time range.',
      );
    }

    const dates: string[] =
      [];

    const current =
      new Date(startDate);

    while (
      current <=
      endDate
    ) {
      const year =
        current.getFullYear();

      const month =
        String(
          current.getMonth() +
          1,
        ).padStart(
          2,
          '0',
        );

      const day =
        String(
          current.getDate(),
        ).padStart(
          2,
          '0',
        );

      dates.push(
        `${year}-${month}-${day}`,
      );

      current.setDate(
        current.getDate() +
        1,
      );
    }

    const slotItems =
      dates.flatMap(
        (date) =>
          dto.courtIds.flatMap(
            (courtId) =>
              requestedSlots.map(
                (time) => {
                  const slotId =
                    `${courtId}_${date}_${time}`.replace(
                      ':',
                      '-',
                    );

                  return {
                    courtId,
                    date,
                    time,

                    ref: db
                      .collection(
                        'bookingSlots',
                      )
                      .doc(
                        slotId,
                      ),
                  };
                },
              ),
          ),
      );

    /*
     * Check for conflicts first.
     */
    const snapshots =
      await Promise.all(
        slotItems.map(
          ({ ref }) =>
            ref.get(),
        ),
      );

    const conflicts =
      snapshots
        .map(
          (
            snapshot,
            index,
          ) => ({
            exists:
              snapshot.exists,

            item:
              slotItems[index],
          }),
        )
        .filter(
          (entry) =>
            entry.exists,
        );

    if (
      conflicts.length >
      0
    ) {
      throw new BadRequestException(
        'One or more selected slots are already booked or blocked.',
      );
    }

    /*
     * Firestore batch limit is 500 writes.
     * Split into chunks.
     */
    const chunkSize =
      450;

    for (
      let index = 0;
      index <
      slotItems.length;
      index += chunkSize
    ) {
      const chunk =
        slotItems.slice(
          index,
          index +
          chunkSize,
        );

      const batch =
        db.batch();

      chunk.forEach(
        ({
          ref,
          courtId,
          date,
          time,
        }) => {
          batch.set(
            ref,
            {
              type:
                'MANUAL_BLOCK',

              blockType:
                'BULK',

              courtId,

              date,

              startTime:
                time,

              reason:
                dto.reason ??
                'Bulk admin block',

              createdAt:
                new Date(),
            },
          );
        },
      );

      await batch.commit();
    }

    return {
      message:
        'Bulk court closure created successfully.',

      courtIds:
        dto.courtIds,

      startDate:
        dto.startDate,

      endDate:
        dto.endDate,

      startTime:
        dto.startTime,

      endTime:
        dto.endTime,

      datesBlocked:
        dates.length,

      slotsBlocked:
        slotItems.length,
    };
  }

  async bulkUnblockCourtSlots(dto: {
    courtIds: string[];
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
  }) {
    const db =
      this.firebaseService.firestore;

    const startDate =
      new Date(
        `${dto.startDate}T00:00:00`,
      );

    const endDate =
      new Date(
        `${dto.endDate}T00:00:00`,
      );

    if (
      startDate > endDate
    ) {
      throw new BadRequestException(
        'Start date cannot be after end date.',
      );
    }

    const requestedSlots =
      this.generateHourlySlots(
        dto.startTime,
        dto.endTime,
      );

    const dates: string[] =
      [];

    const current =
      new Date(startDate);

    while (
      current <= endDate
    ) {
      const year =
        current.getFullYear();

      const month =
        String(
          current.getMonth() + 1,
        ).padStart(
          2,
          '0',
        );

      const day =
        String(
          current.getDate(),
        ).padStart(
          2,
          '0',
        );

      dates.push(
        `${year}-${month}-${day}`,
      );

      current.setDate(
        current.getDate() + 1,
      );
    }

    const slotRefs =
      dates.flatMap(
        (date) =>
          dto.courtIds.flatMap(
            (courtId) =>
              requestedSlots.map(
                (time) => {
                  const slotId =
                    `${courtId}_${date}_${time}`.replace(
                      ':',
                      '-',
                    );

                  return db
                    .collection(
                      'bookingSlots',
                    )
                    .doc(slotId);
                },
              ),
          ),
      );

    const snapshots =
      await Promise.all(
        slotRefs.map(
          (ref) =>
            ref.get(),
        ),
      );

    const refsToDelete =
      snapshots
        .map(
          (
            snapshot,
            index,
          ) => ({
            snapshot,
            ref:
              slotRefs[index],
          }),
        )
        .filter(
          ({ snapshot }) => {
            if (
              !snapshot.exists
            ) {
              return false;
            }

            const data =
              snapshot.data();

            return (
              data?.type ===
              'MANUAL_BLOCK'
            );
          },
        )
        .map(
          ({ ref }) => ref,
        );

    const chunkSize = 450;

    for (
      let index = 0;
      index <
      refsToDelete.length;
      index += chunkSize
    ) {
      const chunk =
        refsToDelete.slice(
          index,
          index +
          chunkSize,
        );

      const batch =
        db.batch();

      chunk.forEach(
        (ref) => {
          batch.delete(ref);
        },
      );

      await batch.commit();
    }

    return {
      message:
        'Bulk court closure removed successfully.',

      slotsReopened:
        refsToDelete.length,
    };
  }

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
}