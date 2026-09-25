import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

@Injectable()
export class TransformResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const httpContext = context.switchToHttp();
    const response = httpContext.getResponse();
    const statusCode = response.statusCode;

    return next.handle().pipe(
      map((data) => {
        // If data already contains custom message, extract it, otherwise use default
        let message = 'Operation successful';
        let payload = data;

        if (data && typeof data === 'object' && 'message' in data && 'data' in data) {
          message = data.message;
          payload = data.data;
        }

        return {
          success: true,
          statusCode,
          message,
          data: payload ?? null,
        };
      }),
    );
  }
}
