import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AppRequest } from '../types/request-context';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: AppRequest, res: Response, next: NextFunction) {
    const existingId = req.headers['x-request-id'] as string;
    const requestId = existingId || `REQ-${uuidv4().substring(0, 8).toUpperCase()}`;

    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);

    next();
  }
}
