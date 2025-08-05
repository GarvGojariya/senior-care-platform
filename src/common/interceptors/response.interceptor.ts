import { CallHandler, ExecutionContext, Injectable } from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { NestInterceptor } from '@nestjs/common/interfaces';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((response) => {
        const { message, data } =
          typeof response === 'object' && response !== null
            ? { message: response.message, data: response.data ?? response }
            : { message: null, data: response };

        return {
          status: 'success',
          success: true,
          message: message || 'Request successful',
          timestamp: new Date().toISOString(),
          data,
        };
      }),
    );
  }
}
