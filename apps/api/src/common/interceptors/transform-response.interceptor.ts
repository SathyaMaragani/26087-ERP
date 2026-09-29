import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '@erplms/types';

@Injectable()
export class TransformResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((result) => {
        // If already structured with success, pass through
        if (
          result &&
          typeof result === 'object' &&
          'success' in result &&
          ('data' in result || 'error' in result)
        ) {
          return result;
        }

        // If returned { data, meta } or pagination
        if (
          result &&
          typeof result === 'object' &&
          'data' in result &&
          'meta' in result
        ) {
          return {
            success: true,
            data: result.data,
            meta: result.meta,
          };
        }

        return {
          success: true,
          data: result,
        };
      }),
    );
  }
}
