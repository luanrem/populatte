import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { MulterError } from 'multer';

@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(MulterExceptionFilter.name);

  public catch(exception: MulterError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Extract user for logging (if available)
    const user = (request as unknown as Record<string, unknown>)['user'] as
      | { id: string }
      | undefined;

    // Map error codes to user-friendly messages
    let message: string;
    let statusCode: number;

    switch (exception.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File size exceeds the maximum allowed size';
        statusCode = HttpStatus.PAYLOAD_TOO_LARGE;
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files uploaded';
        statusCode = HttpStatus.PAYLOAD_TOO_LARGE;
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field';
        statusCode = HttpStatus.BAD_REQUEST;
        break;
      default:
        message = 'File upload limit exceeded';
        statusCode = HttpStatus.PAYLOAD_TOO_LARGE;
    }

    // Log the violation with context
    this.logger.warn({
      message: 'Upload limit violation',
      code: exception.code,
      field: exception.field,
      userId: user?.id,
      path: request.path,
    });

    // Return standardized error response
    const errorName = statusCode === 413 ? 'Payload Too Large' : 'Bad Request';

    response.status(statusCode).json({
      statusCode,
      message,
      error: errorName,
      details: {
        code: exception.code,
        field: exception.field,
      },
    });
  }
}
