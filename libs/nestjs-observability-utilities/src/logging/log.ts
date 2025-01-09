//import axios from 'axios';
import { isAxiosError } from '../errors/is-axios-error';

/** Template tag for log messages. */
export function log(strings: TemplateStringsArray, ...args: unknown[]): string {
  let message = '';
  for (let i = 0; i < args.length; i++) {
    message += strings[i] + logStringify(args[i]);
  }
  return message + strings[args.length];
}

export let customLogValueHandler:
  | undefined
  | ((v: unknown) => string | undefined);

export function logStringify(value: unknown): string {
  const customStr = customLogValueHandler?.(value);
  if (customStr !== undefined) return customStr;

  if (isAxiosError(value)) {
    const { config, response, code } = value;
    const req = `${config?.method?.toUpperCase()} ${config?.url}`;
    const errorCode = response?.status || code;
    const message = response?.data
      ? JSON.stringify(response?.data)
      : value.message;
    return `AxiosError(${errorCode}) on "${req}": ${message}`;
  } else if (value instanceof Error) {
    const message = JSON.stringify(String(value));
    const stack = JSON.stringify(parseStack(value.stack));
    return `${message} ${stack}`;
  }

  return JSON.stringify(value);
}

export function parseStack(stack: string | undefined): string[] {
  if (!stack) return [];
  return [...stack.matchAll(/at +([^\n]+)/g)].map((match) => match[1]);
}
