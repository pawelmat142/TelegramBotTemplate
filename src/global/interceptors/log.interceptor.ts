import {
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Injectable,
    Logger,
} from '@nestjs/common';

import { Observable, tap } from 'rxjs';


@Injectable()
export class LogInterceptor implements NestInterceptor {

    private readonly logger = new Logger(this.constructor.name)

    constructor(
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest()
        const url = request.url
        this.logger.log(`[START] ${url}`)
        
        const response = context.switchToHttp().getResponse()
        return next
          .handle().pipe(tap(() => this.logger.log(`[STOP] ${url}`)))
    }
}
