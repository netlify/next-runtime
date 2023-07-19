import winston from 'winston'

// Define log level from environment variable so we can change it if needed
const logLevel = process.env.LOG_LEVEL ?? 'info';

export const logger = winston.createLogger({
  transports: [new winston.transports.Console({ level: logLevel })],
  // Ignore the log level and just show the message
  // Use winston.format.simple() to include the log level
  format: winston.format.printf(({ message }) => message),
})
