import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import * as client from 'prom-client';

// Métricas globais
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total de requisições HTTP',
  labelNames: ['method', 'route', 'status'],
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duração das requisições HTTP em segundos',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const route = request.route?.path || request.url;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const status = response.statusCode;
          const duration = (Date.now() - startTime) / 1000;

          httpRequestsTotal.inc({ method, route, status: String(status) });
          httpRequestDuration.observe({ method, route, status: String(status) }, duration);
        },
        error: (error) => {
          const status = error.status || 500;
          const duration = (Date.now() - startTime) / 1000;

          httpRequestsTotal.inc({ method, route, status: String(status) });
          httpRequestDuration.observe({ method, route, status: String(status) }, duration);
        },
      }),
    );
  }
}
