/**
 * Defines the available logging levels in ascending order of severity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

import { isInPDA } from "./pda";

/**
 * Logger class providing various logging methods with level filtering and formatting
 */
class Logger {
  /** Prefix string to prepend to all log messages */
  private prefix: string;

  /** Default log level threshold */
  private defaultLevel: LogLevel;

  /** Shared logger level configuration state reference */
  private state: { explicitLevel?: LogLevel };

  /** Flag to track if the current environment is Torn PDA */
  private isPDA = false;

  /** Color scheme for different log types */
  private colors = {
    debug: "#7f8c8d",
    info: "#3498db",
    warn: "#f39c12",
    error: "#e74c3c",
  };

  /**
   * Creates a new Logger instance
   * @param prefix - Optional prefix to identify the source of log messages
   * @param defaultLevel - Minimum log level to display, defaults to INFO
   * @param state - Shared state object containing dynamic level settings
   */
  constructor(
    prefix = "",
    defaultLevel: LogLevel = LogLevel.INFO,
    state: { explicitLevel?: LogLevel } = {},
  ) {
    this.prefix = prefix;
    this.defaultLevel = defaultLevel;
    this.state = state;
    this.detectPDA();
  }

  private detectPDA(): void {
    this.isPDA = isInPDA();
  }

  /**
   * Changes the current logging level dynamically
   * @param level - New log level to set
   */
  public setLevel(level: LogLevel): void {
    this.state.explicitLevel = level;
  }

  /**
   * Resolves the current active log level threshold
   * @returns Active log level
   */
  public getLevel(): LogLevel {
    return this.state.explicitLevel !== undefined
      ? this.state.explicitLevel
      : this.defaultLevel;
  }

  /**
   * Logs a debug message
   * Only displays if the current log level is DEBUG or lower
   * @param args - Arguments to log
   */
  public debug(...args: unknown[]): void {
    if (this.getLevel() <= LogLevel.DEBUG) {
      if (this.isPDA) {
        console.log(`${this.formatPrefix("DEBUG")}`, ...this.formatArgs(args));
      } else {
        console.log(
          `%c${this.formatPrefix("DEBUG")}`,
          `color: ${this.colors.debug}; font-weight: bold`,
          ...args,
        );
      }
    }
  }

  /**
   * Logs an informational message
   * Only displays if the current log level is INFO or lower
   * @param args - Arguments to log
   */
  public info(...args: unknown[]): void {
    if (this.getLevel() <= LogLevel.INFO) {
      if (this.isPDA) {
        console.info(`${this.formatPrefix("INFO")}`, ...this.formatArgs(args));
      } else {
        console.info(
          `%c${this.formatPrefix("INFO")}`,
          `color: ${this.colors.info}; font-weight: bold`,
          ...args,
        );
      }
    }
  }

  /**
   * Logs a warning message
   * Only displays if the current log level is WARN or lower
   * @param args - Arguments to log
   */
  public warn(...args: unknown[]): void {
    if (this.getLevel() <= LogLevel.WARN) {
      if (this.isPDA) {
        console.warn(`${this.formatPrefix("WARN")}`, ...this.formatArgs(args));
      } else {
        console.warn(
          `%c${this.formatPrefix("WARN")}`,
          `color: ${this.colors.warn}; font-weight: bold`,
          ...args,
        );
      }
    }
  }

  /**
   * Logs an error message
   * Only displays if the current log level is ERROR or lower
   * @param args - Arguments to log
   */
  public error(...args: unknown[]): void {
    if (this.getLevel() <= LogLevel.ERROR) {
      if (this.isPDA) {
        console.error(
          `${this.formatPrefix("ERROR")}`,
          ...this.formatArgs(args),
        );
      } else {
        console.error(
          `%c${this.formatPrefix("ERROR")}`,
          `color: ${this.colors.error}; font-weight: bold`,
          ...args,
        );
      }
    }
  }

  /**
   * Creates a collapsible group in the console for related log messages
   * @param label - Label for the group
   * @param collapsed - Whether the group should be initially collapsed
   */
  public group(label: string, collapsed = false): void {
    if (this.getLevel() < LogLevel.NONE) {
      if (collapsed) {
        console.groupCollapsed(this.formatPrefix(""), label);
      } else {
        console.group(this.formatPrefix(""), label);
      }
    }
  }

  /**
   * Ends the current log group
   */
  public groupEnd(): void {
    if (this.getLevel() < LogLevel.NONE) {
      console.groupEnd();
    }
  }

  /**
   * Creates a child logger with a sub-prefix sharing the same log level reference
   * @param subPrefix - Additional prefix for the child logger
   * @returns A new logger instance with combined prefix and the same log level
   */
  public child(subPrefix: string): Logger {
    const childPrefix = this.prefix ? `${this.prefix}:${subPrefix}` : subPrefix;
    return new Logger(childPrefix, this.defaultLevel, this.state);
  }

  /**
   * Formats the prefix for log messages
   * @param level - Log level name to include in prefix
   * @returns Formatted prefix string
   * @private
   */
  private formatPrefix(level: string): string {
    const prefix = this.prefix ? `[${this.prefix}]` : "";
    return level ? `${prefix} - [${level}]: ` : `${prefix}: `;
  }

  /**
   * Recursively deep stringifies object arguments if running under PDA
   * @param args - Array of logger arguments
   * @returns Formatted arguments
   * @private
   */
  private formatArgs(args: unknown[]): unknown[] {
    return args.map((arg) => {
      if (typeof arg === "object" && arg !== null) {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return arg;
    });
  }
}

export default new Logger("FFSV3", LogLevel.DEBUG);
export { Logger };
