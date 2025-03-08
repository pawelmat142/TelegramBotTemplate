import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from "@nestjs/common";
import { Response } from "express";

@Catch(HttpException)
export class AppExceptionFilter implements ExceptionFilter {

    private readonly logger = new Logger(this.constructor.name)
    
    catch(exception: HttpException, host: ArgumentsHost) {
        const ctx = host.switchToHttp()
        this.logger.error(exception)
        
        const response = ctx.getResponse<Response>()
        response.status(exception.getStatus()).json(exception.getResponse())
    }
    
}