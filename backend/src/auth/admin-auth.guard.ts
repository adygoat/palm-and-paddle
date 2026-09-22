import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class AdminAuthGuard
  implements CanActivate
{
  constructor(
    private readonly firebaseService: FirebaseService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest();

    const authorization =
      request.headers.authorization;

    if (!authorization) {
      throw new UnauthorizedException(
        'Authorization token is required.',
      );
    }

    if (!authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Invalid authorization format.',
      );
    }

    const token = authorization.substring(7);

    try {
      // Verify token issued by Firebase
      const decodedToken =
        await this.firebaseService.auth.verifyIdToken(
          token,
        );

      const uid = decodedToken.uid;

      // Look for user role
      const userSnapshot =
        await this.firebaseService.firestore
          .collection('users')
          .doc(uid)
          .get();

      if (!userSnapshot.exists) {
        throw new ForbiddenException(
          'User account does not have admin access.',
        );
      }

      const user = userSnapshot.data();

      if (user?.role !== 'admin') {
        throw new ForbiddenException(
          'Admin access required.',
        );
      }

      // Make Firebase user available to controllers
      request.user = decodedToken;

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      throw new UnauthorizedException(
        'Invalid or expired authentication token.',
      );
    }
  }
}