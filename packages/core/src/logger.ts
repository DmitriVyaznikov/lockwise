export interface Logger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

const defaultLogger: Logger = {
  info(message, ...args) {
    console.log(message, ...args);
  },
  warn(message, ...args) {
    console.warn(message, ...args);
  },
  error(message, ...args) {
    console.error(message, ...args);
  },
};

let currentLogger: Logger = defaultLogger;

export function setLogger(custom: Logger): void {
  currentLogger = custom;
}

export const logger: Logger = {
  info(message, ...args) {
    currentLogger.info(message, ...args);
  },
  warn(message, ...args) {
    currentLogger.warn(message, ...args);
  },
  error(message, ...args) {
    currentLogger.error(message, ...args);
  },
};
