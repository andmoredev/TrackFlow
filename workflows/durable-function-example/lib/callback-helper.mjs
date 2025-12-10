/**
 * Callback helper module for durable function example
 * Handles callback ID generation and management utilities
 */

import { randomUUID } from 'node:crypto';

export function generateCallbackId(executionId) {
  // Generate a unique callback identifier for wait operations
  return `callback-${executionId}-${randomUUID()}`;
}

export function createCallbackPayload(callbackId, data) {
  return {
    callbackId,
    timestamp: new Date().toISOString(),
    data,
    status: 'pending'
  };
}

export function handleTimeout(callbackId, timeoutSeconds = 3600) {
  console.log(`Callback ${callbackId} timed out after ${timeoutSeconds} seconds, proceeding with default values`);
  return {
    timedOut: true,
    callbackId,
    defaultValue: 'timeout-fallback',
    timeoutSeconds,
    timestamp: new Date().toISOString()
  };
}

export function validateCallbackId(callbackId) {
  if (!callbackId || typeof callbackId !== 'string') {
    throw new Error('Callback ID must be a non-empty string');
  }

  if (!callbackId.startsWith('callback-')) {
    throw new Error('Callback ID must start with "callback-" prefix');
  }

  return true;
}

export function createCallbackResponse(callbackId, success = true, data = null, message = null) {
  return {
    callbackId,
    success,
    data,
    message,
    timestamp: new Date().toISOString(),
    responseTime: Date.now()
  };
}

export function parseCallbackId(callbackId) {
  validateCallbackId(callbackId);

  // Remove the 'callback-' prefix
  const withoutPrefix = callbackId.substring(9); // 'callback-'.length = 9

  // Find the last UUID part (typically starts after the last execution ID part)
  // UUIDs are typically 36 characters with 4 dashes, so we look for the pattern
  const parts = withoutPrefix.split('-');
  if (parts.length < 2) {
    throw new Error('Invalid callback ID format');
  }

  // The UUID is typically the last 5 parts (standard UUID format: 8-4-4-4-12)
  // But we'll be more flexible and assume the last part that looks like a UUID segment
  let uuidStartIndex = parts.length - 1;

  // Find where the UUID likely starts by looking for the pattern
  // For now, we'll assume the UUID is everything after the execution ID
  // and the execution ID is everything before the last UUID-like segment

  // Simple approach: assume execution ID doesn't contain UUIDs
  // Split at the last occurrence of a UUID-like pattern
  const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const uuidMatch = callbackId.match(uuidPattern);

  if (uuidMatch) {
    const uuidStart = callbackId.indexOf(uuidMatch[0]);
    const executionId = callbackId.substring(9, uuidStart - 1); // -1 for the dash before UUID
    const uuid = uuidMatch[0];

    return {
      prefix: 'callback',
      executionId,
      uuid
    };
  } else {
    // Fallback: assume last part is UUID, everything else is execution ID
    const uuid = parts[parts.length - 1];
    const executionId = parts.slice(0, -1).join('-');

    return {
      prefix: 'callback',
      executionId,
      uuid
    };
  }
}