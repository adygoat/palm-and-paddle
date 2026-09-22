import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly firebaseService: FirebaseService,
  ) {}

  async getAvailability(courtId: string, date: string) {
    const db = this.firebaseService.firestore;

    const snapshot = await db
      .collection('bookingSlots')
      .where('courtId', '==', courtId)
      .where('date', '==', date)
      .get();

    const bookedTimes = snapshot.docs.map(
      (doc) => doc.data().startTime,
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

      slots: slots.map((slot) => ({
        ...slot,
        available: !bookedTimes.includes(slot.startTime),
      })),
    };
  }
}