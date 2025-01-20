/** A callback signature for loggers. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LoggerCallback = (text: string, details?: any) => void;

/**
 * Represents a generic logger interface with different log levels.
 */
export interface Logger {
    /** Info-level logging. */
    info: LoggerCallback;
    /** Warn-level logging. */
    warn: LoggerCallback;
    /** Error-level logging. */
    error: LoggerCallback;
}
