export const logger = {
  debug(message: string, meta?: unknown) {
    console.debug(`[mh-os] ${message}`, meta ?? "");
  },
  info(message: string, meta?: unknown) {
    console.info(`[mh-os] ${message}`, meta ?? "");
  },
  warn(message: string, meta?: unknown) {
    console.warn(`[mh-os] ${message}`, meta ?? "");
  },
  error(message: string, meta?: unknown) {
    console.error(`[mh-os] ${message}`, meta ?? "");
  },
};
