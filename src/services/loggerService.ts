import { LogLevel } from '@/types';

/**
 * Logger Service for the application
 * Provides structured logging with different log levels
 * and supports both console and remote logging
 */
class LoggerService {
  private static instance: LoggerService;
  private logLevel: LogLevel = 'info'; // Default log level
  private remoteLoggingEndpoint: string | null = null;
  private appVersion: string = '1.0.0';
  private enableConsoleLogging: boolean = true;
  private enableRemoteLogging: boolean = false;
  private context: Record<string, any> = {};

  private constructor() {
    // Initialize with environment-specific settings
    if (process.env.NODE_ENV === 'development') {
      this.logLevel = 'debug';
    }

    // Add basic context information
    this.context = {
      appVersion: this.appVersion,
      environment: process.env.NODE_ENV || 'unknown',
      userAgent: navigator.userAgent,
    };
  }

  /**
   * Get the singleton instance of LoggerService
   */
  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  /**
   * Set the current log level
   * @param level The log level to set
   */
  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    this.debug('Logger', `Log level set to ${level}`);
  }

  /**
   * Get the current log level
   */
  public getLogLevel(): LogLevel {
    return this.logLevel;
  }

  /**
   * Configure remote logging
   * @param endpoint The endpoint URL for remote logging
   * @param enabled Whether remote logging is enabled
   */
  public configureRemoteLogging(endpoint: string, enabled: boolean = true): void {
    this.remoteLoggingEndpoint = endpoint;
    this.enableRemoteLogging = enabled;
    this.info('Logger', `Remote logging ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Configure console logging
   * @param enabled Whether console logging is enabled
   */
  public configureConsoleLogging(enabled: boolean): void {
    this.enableConsoleLogging = enabled;
    this.info('Logger', `Console logging ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Add context information to all logs
   * @param key The context key
   * @param value The context value
   */
  public addContext(key: string, value: any): void {
    this.context[key] = value;
  }

  /**
   * Remove context information
   * @param key The context key to remove
   */
  public removeContext(key: string): void {
    delete this.context[key];
  }

  /**
   * Log a debug message
   * @param component The component or module name
   * @param message The message to log
   * @param data Additional data to include
   */
  public debug(component: string, message: string, data?: any): void {
    if (this.shouldLog('debug')) {
      this.log('debug', component, message, data);
    }
  }

  /**
   * Log an info message
   * @param component The component or module name
   * @param message The message to log
   * @param data Additional data to include
   */
  public info(component: string, message: string, data?: any): void {
    if (this.shouldLog('info')) {
      this.log('info', component, message, data);
    }
  }

  /**
   * Log a warning message
   * @param component The component or module name
   * @param message The message to log
   * @param data Additional data to include
   */
  public warn(component: string, message: string, data?: any): void {
    if (this.shouldLog('warn')) {
      this.log('warn', component, message, data);
    }
  }

  /**
   * Log an error message
   * @param component The component or module name
   * @param message The message to log
   * @param error The error object or additional data
   */
  public error(component: string, message: string, error?: any): void {
    if (this.shouldLog('error')) {
      this.log('error', component, message, error);
    }
  }

  /**
   * Check if a message with the given level should be logged
   * @param level The log level to check
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    return levels[level] >= levels[this.logLevel];
  }

  /**
   * Internal method to handle logging
   * @param level The log level
   * @param component The component or module name
   * @param message The message to log
   * @param data Additional data to include
   */
  private log(level: LogLevel, component: string, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      component,
      message,
      data,
      context: this.context,
    };

    // Console logging
    if (this.enableConsoleLogging) {
      this.logToConsole(level, logEntry);
    }

    // Remote logging
    if (this.enableRemoteLogging && this.remoteLoggingEndpoint) {
      this.logToRemote(logEntry);
    }
  }

  /**
   * Log to the browser console
   * @param level The log level
   * @param logEntry The log entry to log
   */
  private logToConsole(level: LogLevel, logEntry: any): void {
    const { timestamp, component, message, data } = logEntry;
    const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] [${component}] ${message}`;

    switch (level) {
      case 'debug':
        console.debug(formattedMessage, data || '');
        break;
      case 'info':
        console.info(formattedMessage, data || '');
        break;
      case 'warn':
        console.warn(formattedMessage, data || '');
        break;
      case 'error':
        console.error(formattedMessage, data || '');
        break;
    }
  }

  /**
   * Log to a remote endpoint
   * @param logEntry The log entry to send
   */
  private logToRemote(logEntry: any): void {
    if (!this.remoteLoggingEndpoint) return;

    // Only send errors and warnings to remote by default
    if (logEntry.level === 'error' || logEntry.level === 'warn') {
      try {
        fetch(this.remoteLoggingEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(logEntry),
          // Use keepalive to ensure the request is sent even if the page is unloading
          keepalive: true,
        }).catch(err => {
          // Fallback to console if remote logging fails
          console.error('Failed to send log to remote endpoint:', err);
        });
      } catch (err) {
        // Fallback to console if remote logging fails
        console.error('Failed to send log to remote endpoint:', err);
      }
    }
  }
}

// Export singleton instance
export const loggerService = LoggerService.getInstance();

// Export convenience methods
export const debug = (component: string, message: string, data?: any) =>
  loggerService.debug(component, message, data);

export const info = (component: string, message: string, data?: any) =>
  loggerService.info(component, message, data);

export const warn = (component: string, message: string, data?: any) =>
  loggerService.warn(component, message, data);

export const error = (component: string, message: string, error?: any) =>
  loggerService.error(component, message, error);
