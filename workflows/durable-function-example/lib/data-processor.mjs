/**
 * Data processor module for durable function example
 * Handles processing input data and generating work items
 */

export function processData(inputData) {
  if (!inputData?.items) {
    throw new Error('Invalid input data: items array is required');
  }

  // Generate work items from input data
  const workItems = inputData.items.map((item, index) => ({
    id: `work-item-${index + 1}`,
    data: item,
    priority: (index % 3) + 1, // Deterministic priority 1-3 based on index
    status: 'pending'
  }));

  return workItems;
}

export function aggregateResults(results) {
  const completedItems = results.filter(r => r.processed);
  const failedItems = results.filter(r => !r.processed);

  return {
    totalItems: results.length,
    completedItems: completedItems.length,
    failedItems: failedItems.length,
    successRate: results.length > 0 ? completedItems.length / results.length : 0,
    summary: failedItems.length === 0
      ? 'All items processed successfully'
      : `${completedItems.length} items completed, ${failedItems.length} failed`
  };
}

export function generateWorkItems(inputData) {
  // Alternative function name for clarity
  return processData(inputData);
}

export function validateWorkItem(workItem) {
  const requiredFields = ['id', 'data', 'priority', 'status'];
  const missingFields = requiredFields.filter(field => !(field in workItem));

  if (missingFields.length > 0) {
    throw new Error(`Work item missing required fields: ${missingFields.join(', ')}`);
  }

  if (typeof workItem.priority !== 'number' || workItem.priority < 1 || workItem.priority > 3) {
    throw new Error('Work item priority must be a number between 1 and 3');
  }

  const validStatuses = ['pending', 'processing', 'completed', 'failed'];
  if (!validStatuses.includes(workItem.status)) {
    throw new Error(`Work item status must be one of: ${validStatuses.join(', ')}`);
  }

  return true;
}