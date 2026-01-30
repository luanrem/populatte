import {
  Injectable,
  Logger,
  PipeTransform,
  UnprocessableEntityException,
} from '@nestjs/common';

// Magic byte signatures for file type validation
const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04] as const; // .xlsx files
const OLE2_SIGNATURE = [
  0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1,
] as const; // .xls files

/**
 * Helper function to check if buffer starts with given magic bytes
 */
function matchesMagicBytes(
  buffer: Buffer,
  signature: readonly number[],
): boolean {
  if (buffer.length < signature.length) {
    return false;
  }

  for (let i = 0; i < signature.length; i++) {
    const signatureByte = signature[i];
    if (signatureByte === undefined || buffer[i] !== signatureByte) {
      return false;
    }
  }

  return true;
}

/**
 * Validates uploaded files by inspecting magic bytes to prevent MIME-type spoofing.
 * Ensures file extensions match their actual content.
 *
 * Supported formats:
 * - .xlsx (ZIP signature: 0x504B0304)
 * - .xls (OLE2 signature: 0xD0CF11E0A1B11AE1)
 * - .csv (UTF-8 text heuristic)
 */
@Injectable()
export class FileContentValidationPipe implements PipeTransform {
  private readonly logger = new Logger(FileContentValidationPipe.name);

  public transform(files: Express.Multer.File[]): Express.Multer.File[] {
    // Validate each file with fail-fast behavior
    for (const file of files) {
      this.validateFile(file);
    }

    return files;
  }

  private validateFile(file: Express.Multer.File): void {
    // Check for empty/missing buffer
    if (!file.buffer || file.buffer.length === 0) {
      this.logValidationFailure(file, 'Empty or missing buffer');
      this.throwInvalidFileError();
    }

    // Extract file extension
    const extension = file.originalname.split('.').pop()?.toLowerCase();

    if (!extension) {
      this.logValidationFailure(file, 'No file extension');
      this.throwInvalidFileError();
    }

    // Validate based on extension
    let isValid = false;

    switch (extension) {
      case 'xlsx':
        isValid = matchesMagicBytes(file.buffer, ZIP_SIGNATURE);
        if (!isValid) {
          this.logValidationFailure(
            file,
            'Invalid .xlsx file (missing ZIP signature)',
          );
        }
        break;

      case 'xls':
        isValid = matchesMagicBytes(file.buffer, OLE2_SIGNATURE);
        if (!isValid) {
          this.logValidationFailure(
            file,
            'Invalid .xls file (missing OLE2 signature)',
          );
        }
        break;

      case 'csv':
        isValid = this.isValidCsvContent(file.buffer);
        if (!isValid) {
          this.logValidationFailure(
            file,
            'Invalid .csv file (failed UTF-8 text heuristic)',
          );
        }
        break;

      default:
        this.logValidationFailure(
          file,
          `Unsupported file extension: .${extension}`,
        );
        this.throwInvalidFileError();
    }

    if (!isValid) {
      this.throwInvalidFileError();
    }
  }

  /**
   * CSV validation: check if buffer contains valid UTF-8 text
   * - No null bytes
   * - >95% printable ASCII characters in first 512 bytes
   */
  private isValidCsvContent(buffer: Buffer): boolean {
    const sampleSize = Math.min(512, buffer.length);
    const sample = buffer.subarray(0, sampleSize);

    // Convert to UTF-8 string
    const text = sample.toString('utf-8');

    // Reject if contains null character
    if (text.includes('\0')) {
      return false;
    }

    // Count printable characters (space through tilde, plus newlines and tabs)
    let printableCount = 0;
    for (const char of text) {
      const code = char.charCodeAt(0);
      // Match [\x20-\x7E\r\n\t]
      if (
        (code >= 0x20 && code <= 0x7e) || // Printable ASCII
        code === 0x0d || // \r
        code === 0x0a || // \n
        code === 0x09 // \t
      ) {
        printableCount++;
      }
    }

    const ratio = printableCount / text.length;
    return ratio > 0.95;
  }

  private logValidationFailure(
    file: Express.Multer.File,
    reason: string,
  ): void {
    const firstBytes = file.buffer
      ? file.buffer.subarray(0, 8).toString('hex')
      : 'no buffer';

    this.logger.warn({
      message: 'File content validation failed',
      reason,
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      firstBytes,
    });
  }

  private throwInvalidFileError(): never {
    throw new UnprocessableEntityException({
      statusCode: 422,
      message: 'One or more files are not valid Excel files',
      error: 'Unprocessable Entity',
      details: { code: 'INVALID_FILE_TYPE' },
    });
  }
}
