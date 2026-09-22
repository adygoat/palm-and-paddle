import {
  Injectable,
} from '@nestjs/common';

import {
  cert,
  getApps,
  initializeApp,
} from 'firebase-admin/app';

import {
  getFirestore,
} from 'firebase-admin/firestore';

import {
  getAuth,
} from 'firebase-admin/auth';

@Injectable()
export class FirebaseService {
  constructor() {
    if (
      getApps().length === 0
    ) {
      const projectId =
        process.env
          .FIREBASE_PROJECT_ID;

      const clientEmail =
        process.env
          .FIREBASE_CLIENT_EMAIL;

      const privateKey =
        process.env
          .FIREBASE_PRIVATE_KEY
          ?.replace(
            /\\n/g,
            '\n',
          );

      if (
        !projectId ||
        !clientEmail ||
        !privateKey
      ) {
        throw new Error(
          'Firebase Admin environment variables are missing.',
        );
      }

      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }
  }

  get firestore() {
    return getFirestore();
  }

  get auth() {
    return getAuth();
  }
}