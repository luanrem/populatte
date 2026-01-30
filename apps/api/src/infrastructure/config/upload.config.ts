import { registerAs } from '@nestjs/config';

export const uploadConfig = registerAs('upload', () => ({
  maxFileSize: parseInt(process.env['UPLOAD_MAX_FILE_SIZE'] ?? '5242880', 10), // 5MB default
  maxFileCount: parseInt(process.env['UPLOAD_MAX_FILE_COUNT'] ?? '50', 10),
}));

export type UploadConfig = ReturnType<typeof uploadConfig>;
