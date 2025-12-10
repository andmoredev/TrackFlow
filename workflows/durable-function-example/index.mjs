import { withDurableExecution } from '@aws/durable-execution-sdk-js';
import { processData } from './lib/data-processor.mjs';

export const handler = withDurableExecution(async (event, context) => {
  // Durable function example demonstrating all key durable operations

  // Step 1: Initial step operation - process input data
  const workItems = await context.step('processInputData', async () => {
    return processData(event.inputData);
  });

  // Step 2: Wait for callback operation - pause for external event
  // Wait for external callback with timeout handling
  const callbackResult = await context.waitForCallback(
    "wait-for-external-callback",
    async (callbackId, ctx) => {
      // Submit callback ID to external system (simulated)
      ctx.logger.info(`Callback ID ${callbackId} submitted to external system`);
      // In real implementation, this would call an external API
      // await submitToExternalAPI(callbackId);
    },
    { timeout: { minutes: 60 } } // 1 hour timeout
  );

  // Step 3: Parallel operations - process multiple work streams concurrently
  const parallelResults = await context.parallel([
    async (ctx) => ctx.step('parallelTask1', async () => {
      // Simulate work stream 1 - data validation
      await new Promise(resolve => setTimeout(resolve, 100));
      return {
        task: 1,
        type: 'validation',
        result: 'completed',
        itemsValidated: workItems.length,
        timestamp: Date.now()
      };
    }),
    async (ctx) => ctx.step('parallelTask2', async () => {
      // Simulate work stream 2 - data enrichment
      await new Promise(resolve => setTimeout(resolve, 150));
      return {
        task: 2,
        type: 'enrichment',
        result: 'completed',
        itemsEnriched: workItems.length,
        timestamp: Date.now()
      };
    }),
    async (ctx) => ctx.step('parallelTask3', async () => {
      // Simulate work stream 3 - quality check
      await new Promise(resolve => setTimeout(resolve, 80));
      return {
        task: 3,
        type: 'quality-check',
        result: 'completed',
        qualityScore: 0.95,
        timestamp: Date.now()
      };
    })
  ]);

  // Step 4: Map operation - iterate over collection with checkpoints
  const mapResults = await context.map(workItems, async (ctx, item, index) => {
    return await ctx.step(`processItem-${index}`, async () => {
      // Simulate processing time based on priority
      const processingTime = item.priority * 50;
      await new Promise(resolve => setTimeout(resolve, processingTime));

      // Transform the work item
      const processedItem = {
        ...item,
        status: 'completed',
        processed: true,
        processedAt: Date.now(),
        processingTime,
        index,
        transformedData: `processed-${item.data}`,
        checkpointId: `checkpoint-${item.id}-${index}`
      };

      return processedItem;
    });
  });

  // Step 5: Final aggregation step
  const finalResult = await context.step('aggregateResults', async () => {
    const endTime = Date.now();
    const startTime = event.startTime || endTime;

    // Calculate comprehensive metrics
    const totalProcessingTime = mapResults.reduce((sum, item) => sum + (item.processingTime || 0), 0);
    const avgProcessingTime = mapResults.length > 0 ? totalProcessingTime / mapResults.length : 0;

    return {
      // Workflow identification
      workflowId: context.executionId,
      executionId: context.executionId,

      // Operation results
      processedItems: mapResults,
      parallelResults,
      callbackResult,

      // Execution metrics
      totalDuration: endTime - startTime,
      totalProcessingTime,
      avgProcessingTime,

      // Checkpoint and operation counts
      checkpointCount: mapResults.length + parallelResults.length + 4, // processInputData, waitForCallback, aggregateResults + map/parallel
      operationCount: {
        steps: mapResults.length + parallelResults.length + 3,
        parallel: parallelResults.length,
        map: mapResults.length,
        wait: 1
      },

      // Success metrics
      itemsProcessed: mapResults.length,
      successfulItems: mapResults.filter(item => item.processed).length,
      successRate: mapResults.length > 0 ? mapResults.filter(item => item.processed).length / mapResults.length : 0,

      // Timestamps
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      completedAt: new Date().toISOString()
    };
  });

  return finalResult;
});