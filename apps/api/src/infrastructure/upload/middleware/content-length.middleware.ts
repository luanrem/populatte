import { HttpStatus, Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class ContentLengthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ContentLengthMiddleware.name);

  public constructor(private readonly configService: ConfigService) {}

  public use(req: Request, res: Response, next: NextFunction): void {
    const contentLength = req.headers['content-length'];

    // Pass through if no Content-Length header
    if (!contentLength) {
      next();
      return;
    }

    // Read config values with defaults
    const maxFileSize = this.configService.get<number>(
      'upload.maxFileSize',
      5242880,
    );
    const maxFileCount = this.configService.get<number>(
      'upload.maxFileCount',
      50,
    );

    // Calculate threshold: (maxFileSize * maxFileCount) + overhead
    const overhead = 1024 * 100; // 100KB for multipart boundaries/metadata
    const threshold = maxFileSize * maxFileCount + overhead;

    // Parse content-length
    const parsedContentLength = parseInt(contentLength, 10);

    // Reject if exceeds threshold
    if (parsedContentLength > threshold) {
      this.logger.warn({
        message: 'Request rejected: Content-Length exceeds threshold',
        contentLength: parsedContentLength,
        threshold,
        path: req.path,
      });

      res.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
        statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        message: 'Request payload too large',
        error: 'Payload Too Large',
      });
      return;
    }

    // Pass through to Multer
    next();
  }
}
