import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // Clerk configuration
  CLERK_SECRET_KEY: Joi.string()
    .required()
    .description('Clerk secret key for backend API calls'),
  CLERK_PUBLISHABLE_KEY: Joi.string()
    .required()
    .description('Clerk publishable key for frontend'),
  CLERK_WEBHOOK_SIGNING_SECRET: Joi.string()
    .optional()
    .description('Clerk webhook signing secret'),

  // Database
  DATABASE_URL: Joi.string()
    .required()
    .description('PostgreSQL connection string'),

  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3001),

  // Upload configuration
  UPLOAD_MAX_FILE_SIZE: Joi.number()
    .default(5 * 1024 * 1024)
    .description('Maximum file size in bytes'),
  UPLOAD_MAX_FILE_COUNT: Joi.number()
    .default(50)
    .description('Maximum number of files per request'),
});
