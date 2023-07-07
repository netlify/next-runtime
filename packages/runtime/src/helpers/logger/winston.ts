import winston from 'winston'

export const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
  ],
  // Ignore the log level and just show the message
  // Use winston.format.simple() to include the log level
  format: winston.format.printf(({message}) => message),
});
