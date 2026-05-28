export interface LogContext {
  correlationId: string;
  [key: string]: unknown;
}

let _correlationId = crypto.randomUUID();

export function setCorrelationId(id: string) {
  _correlationId = id;
}

export function getCorrelationId(): string {
  return _correlationId;
}

function structuredLog(level: string, message: string, context?: Partial<LogContext>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    correlationId: _correlationId,
    message,
    ...(context ?? {}),
  };
  if (level === 'ERROR') {
    console.error(JSON.stringify(entry));
  } else if (level === 'WARN') {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

export const log = {
  info: (message: string, context?: Partial<LogContext>) => structuredLog('INFO', message, context),
  warn: (message: string, context?: Partial<LogContext>) => structuredLog('WARN', message, context),
  error: (message: string, context?: Partial<LogContext>) => structuredLog('ERROR', message, context),
};
