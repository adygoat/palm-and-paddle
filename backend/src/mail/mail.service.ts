import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  private readonly transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT ?? 587),
    secure: false,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASSWORD,
    },
  });

  async sendNewBookingNotification(booking: {
    reference: string;
    customerName: string;
    email: string;
    phone: string;
    courtIds: string[];
    date: string;
    startTime: string;
    endTime: string;
    totalPrice: number;
    notes?: string;
  }) {
    try {
      await this.transporter.sendMail({
        from: `"ChocsDwacks Palm & Paddle Sports Center" <${process.env.MAIL_USER}>`,
        to: process.env.ADMIN_EMAIL,
        subject: `New Booking Request - ${booking.reference}`,
        html: `
          <h2>ChocsDwacks Palm & Paddle Sports Center Booking Request</h2>

          <p><strong>Reference:</strong> ${booking.reference}</p>

          <hr />

          <p><strong>Customer:</strong> ${booking.customerName}</p>
          <p><strong>Email:</strong> ${booking.email}</p>
          <p><strong>Phone:</strong> ${booking.phone}</p>

          <hr />

          <p>
            <strong>Courts:</strong>
            ${booking.courtIds.join(', ')}
          </p>

          <p><strong>Date:</strong> ${booking.date}</p>

          <p>
            <strong>Time:</strong>
            ${booking.startTime} - ${booking.endTime}
          </p>

          <p>
            <strong>Total Price:</strong>
            ₱${booking.totalPrice.toLocaleString()}
          </p>

          ${
            booking.notes
              ? `
                <p>
                  <strong>Notes:</strong>
                  ${booking.notes}
                </p>
              `
              : ''
          }

          <p>
            Status:
            <strong>PENDING</strong>
          </p>
        `,
      });

      this.logger.log(
        `Booking email sent for ${booking.reference}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send booking email for ${booking.reference}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async sendBookingConfirmedEmail(booking: {
    reference: string;
    customerName: string;
    email: string;
    courtIds: string[];
    date: string;
    startTime: string;
    endTime: string;
    totalPrice: number;
  }) {
    try {
      await this.transporter.sendMail({
        from: `"ChocsDwacks Palm & Paddle Sports Center" <${process.env.MAIL_USER}>`,
        to: booking.email,
        subject: `Booking Confirmed - ${booking.reference}`,
        html: `
          <h2>Your booking is confirmed!</h2>

          <p>Hello ${booking.customerName},</p>

          <p>
            Your Palm & Paddle court booking has been confirmed.
          </p>

          <p>
            <strong>Reference:</strong>
            ${booking.reference}
          </p>

          <p>
            <strong>Courts:</strong>
            ${booking.courtIds.join(', ')}
          </p>

          <p>
            <strong>Date:</strong>
            ${booking.date}
          </p>

          <p>
            <strong>Time:</strong>
            ${booking.startTime} - ${booking.endTime}
          </p>

          <p>
            <strong>Total Price:</strong>
            ₱${booking.totalPrice.toLocaleString()}
          </p>

          <p>
            Status:
            <strong>CONFIRMED</strong>
          </p>

          <p>
            Thank you for booking with ChocsDwacks Palm & Paddle Sports Center!
          </p>
        `,
      });

      this.logger.log(
        `Confirmation email sent to ${booking.email}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send confirmation email for ${booking.reference}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async sendBookingCancelledEmail(booking: {
    reference: string;
    customerName: string;
    email: string;
    courtIds: string[];
    date: string;
    startTime: string;
    endTime: string;
    totalPrice?: number;
  }) {
    try {
      await this.transporter.sendMail({
        from: `"ChocsDwacks Palm & Paddle Sports Center" <${process.env.MAIL_USER}>`,
        to: booking.email,
        subject: `Booking Cancelled - ${booking.reference}`,
        html: `
          <h2>Your booking has been cancelled</h2>

          <p>Hello ${booking.customerName},</p>

          <p>
            Your ChocsDwacks Palm & Paddle Sports Center booking has been cancelled.
          </p>

          <p>
            <strong>Reference:</strong>
            ${booking.reference}
          </p>

          <p>
            <strong>Courts:</strong>
            ${booking.courtIds.join(', ')}
          </p>

          <p>
            <strong>Date:</strong>
            ${booking.date}
          </p>

          <p>
            <strong>Time:</strong>
            ${booking.startTime} - ${booking.endTime}
          </p>

          ${
            booking.totalPrice !== undefined
              ? `
                <p>
                  <strong>Booking Total:</strong>
                  ₱${booking.totalPrice.toLocaleString()}
                </p>
              `
              : ''
          }

          <p>
            Status:
            <strong>CANCELLED</strong>
          </p>

          <p>
            If you need assistance, please contact ChocsDwacks Palm & Paddle Sports Center.
          </p>
        `,
      });

      this.logger.log(
        `Cancellation email sent to ${booking.email}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send cancellation email for ${booking.reference}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}