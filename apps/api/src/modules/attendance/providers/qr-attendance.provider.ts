import { Injectable, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';

export interface DynamicQrPayload {
  sessionId: string;
  organizationId: string;
  issuedAt: number;
  expiresAt: number;
  rotationIndex: number;
  token: string;
  qrCodeUrl: string;
}

@Injectable()
export class QrAttendanceProvider {
  private readonly secretKey = process.env.JWT_SECRET || 'ncct-attendance-qr-secret-key-2026';

  /**
   * Generates a time-limited rotating QR payload valid for 60 seconds.
   */
  generateRotatingQr(sessionId: string, organizationId: string, validSeconds = 60): DynamicQrPayload {
    const issuedAt = Date.now();
    const expiresAt = issuedAt + validSeconds * 1000;
    const rotationIndex = Math.floor(issuedAt / (validSeconds * 1000));

    const rawPayload = `${sessionId}:${organizationId}:${issuedAt}:${expiresAt}:${rotationIndex}`;
    const hmac = crypto.createHmac('sha256', this.secretKey).update(rawPayload).digest('hex');
    const token = Buffer.from(JSON.stringify({ rawPayload, hmac })).toString('base64url');

    return {
      sessionId,
      organizationId,
      issuedAt,
      expiresAt,
      rotationIndex,
      token,
      qrCodeUrl: `https://api.ncct-platform.gov.in/attendance/qr?token=${token}`,
    };
  }

  /**
   * Validates the rotating QR code token, verifying cryptographic integrity and time validity.
   */
  verifyQrToken(token: string, expectedSessionId: string, expectedOrgId: string): boolean {
    try {
      const decodedJson = Buffer.from(token, 'base64url').toString('utf8');
      const { rawPayload, hmac } = JSON.parse(decodedJson);

      const expectedHmac = crypto.createHmac('sha256', this.secretKey).update(rawPayload).digest('hex');
      if (hmac !== expectedHmac) {
        throw new BadRequestException('Invalid QR code cryptographic signature');
      }

      const [sessionId, orgId, , expiresAtStr] = rawPayload.split(':');
      if (sessionId !== expectedSessionId) {
        throw new BadRequestException('QR code is not designated for this session');
      }
      if (orgId !== expectedOrgId) {
        throw new BadRequestException('QR code is not designated for this institution');
      }

      const expiresAt = parseInt(expiresAtStr, 10);
      if (Date.now() > expiresAt) {
        throw new BadRequestException('Dynamic QR code has expired. Please scan the current rotating code.');
      }

      return true;
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException('Corrupted or invalid QR token format');
    }
  }
}
