#!/usr/bin/env node

import { LambdaClient, SendDurableExecutionCallbackSuccessCommand, SendDurableExecutionCallbackFailureCommand } from '@aws-sdk/client-lambda';

const client = new LambdaClient({ region: process.env.AWS_REGION || 'us-east-1' });

/**
 * Simple CLI script to resume a durable function workflow
 * Usage:
 *   node scripts/resume-workflow.mjs <callbackId> [success|failure] [payload]
 *
 * Examples:
 *   # Resume with success and validation data
 *   node scripts/resume-workflow.mjs callback-123 success '{"albums":[{"albumIndex":1,"year":1974}],"validated":true}'
 *
 *   # Resume with simple success
 *   node scripts/resume-workflow.mjs callback-123 success '{"approved":true}'
 *
 *   # Resume with failure
 *   node scripts/resume-workflow.mjs callback-123 failure "User rejected validation"
 *
 *   # Default success (no payload)
 *   node scripts/resume-workflow.mjs callback-123
 */

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: node scripts/resume-workflow.mjs <callbackId> [success|failure] [payload]');
    console.error('');
    console.error('Examples:');
    console.error('  # Resume with success and validation data');
    console.error('  node scripts/resume-workflow.mjs callback-123 success \'{"albums":[{"albumIndex":1,"year":1974}],"validated":true}\'');
    console.error('');
    console.error('  # Resume with simple success');
    console.error('  node scripts/resume-workflow.mjs callback-123 success \'{"approved":true}\'');
    console.error('');
    console.error('  # Resume with failure');
    console.error('  node scripts/resume-workflow.mjs callback-123 failure "User rejected validation"');
    console.error('');
    console.error('  # Default success (no payload)');
    console.error('  node scripts/resume-workflow.mjs callback-123');
    process.exit(1);
  }

  const callbackId = args[0];
  const action = args[1] || 'success';
  const payload = args[2];

  console.log(`Resuming workflow with callback ID: ${callbackId}`);
  console.log(`Action: ${action}`);

  try {
    if (action === 'failure') {
      // Send failure
      const errorMessage = payload || 'Workflow failed via CLI script';
      const command = new SendDurableExecutionCallbackFailureCommand({
        CallbackId: callbackId,
        Error: errorMessage
      });

      await client.send(command);
      console.log(`✅ Successfully sent failure to workflow`);
      console.log(`Error message: ${errorMessage}`);
    } else {
      // Send success
      let resultPayload = { approved: true, completedAt: new Date().toISOString() };

      if (payload) {
        try {
          resultPayload = JSON.parse(payload);
        } catch (error) {
          console.error('❌ Invalid JSON payload, using default success payload');
        }
      }

      const command = new SendDurableExecutionCallbackSuccessCommand({
        CallbackId: callbackId,
        Payload: JSON.stringify(resultPayload)
      });

      await client.send(command);
      console.log(`✅ Successfully resumed workflow`);
      console.log(`Payload sent:`, JSON.stringify(resultPayload, null, 2));
    }
  } catch (error) {
    console.error('❌ Failed to resume workflow:', error.message);

    if (error.name === 'ValidationException') {
      console.error('💡 This usually means the callback ID is invalid or already used');
    } else if (error.name === 'ResourceNotFoundException') {
      console.error('💡 The callback ID was not found - it may have expired or been used already');
    }

    process.exit(1);
  }
}

main().catch(console.error);