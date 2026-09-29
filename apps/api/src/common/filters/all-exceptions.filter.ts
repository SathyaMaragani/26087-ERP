import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { AppRequest } from '../types/request-context';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<AppRequest>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const requestId = request.requestId || 'REQ-UNKNOWN';

    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected internal server error occurred';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
        code = exception.name.toUpperCase().replace(/\s+/g, '_');
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, any>;
        message = obj.message || obj.error || message;
        code = obj.code || obj.error || exception.name.toUpperCase().replace(/\s+/g, '_');
        details = obj.details;

        if (Array.isArray(obj.message)) {
          // Validation error
          code = 'VALIDATION_ERROR';
          message = obj.message.join(', ');
          details = obj.message;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      code = exception.name || 'UNKNOWN_ERROR';
    }

    if (status >= 500) {
      this.logger.error(
        `[${requestId}] [${request.method} ${request.url}] ${status} - ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `[${requestId}] [${request.method} ${request.url}] ${status} - ${message}`,
      );
    }

    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        requestId,
        ...(details ? { details } : {}),
      },
    });
  }
}
