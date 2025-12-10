# Design Document

## Overview

This design outlines a demonstration Lambda Durable Function that showcases all key durable operations in a single workflow. The function processes a simple data pipeline that includes sequential steps, parallel processing, map operations, and human-in-the-loop callbacks.

## Architecture

The durable function will implement a mock data processing pipeline:

1. **Initial Step**: Process input data and generate work items
2. **Wait for Callback**: Pause for external approval/validation
3. **Parallel Operations**: Process multiple work streams concurrently
4. **Map Operation**: Transform a collection of items with checkpoints
5. **Final Step**: Aggregate results and return output

## Components and Interfaces

### Main Handler
- **File**: `workflows/durable-function-example/index.mjs`
- **Purpose**: Orchestrate the demonstration workflow using durable operations
- **Dependencies**: AWS Durable Execution SDK

### Helper Modules
- **File**: `workflows/durable-function-example/lib/data-processor.mjs`
- **Purpose**: Business logic for data processing steps
- **File**: `workflows/durable-function-example/lib/callback-helper.mjs`
- **Purpose**: Utilities for callback management

## Data Models

### Input Event
```javascript
{
  workflowId: string,
  inputData: {
    items: Array<string>
  }
}
```

### Work Item
```javascript
{
  id: string,
  data: string,
  priority: number,
  status: 'pending' | 'processing' | 'completed'
}
```

### Output Result
```javascript
{
  workflowId: string,
  processedItems: Array<ProcessedItem>,
  parallelResults: Array<any>,
  mapResults: Array<any>,
  totalDuration: number,
  checkpointCount: number
}
```

## Workflow Operations

The function will demonstrate four key durable operations:

### Step Operations
- Sequential data processing with automatic checkpoints
- Deterministic execution for replay capability
- Error handling with built-in retry

### Wait for Callback
- Pause execution without compute charges
- Generate unique callback identifiers
- Resume execution when callback is received

### Parallel Operations
- Concurrent execution of multiple steps
- Independent checkpoint management
- Result aggregation when all complete

### Map Operations
- Iterate over collections with durable checkpoints
- Process each item independently
- Return results for all processed items

## Error Handling

### Step Operation Errors
- Automatic retry with exponential backoff (built into durable execution)
- Error propagation to calling context
- Checkpoint preservation on failure

### Callback Timeout Handling
- Configurable timeout for wait operations
- Automatic continuation with default values on timeout
- Error logging for debugging

### Parallel Operation Failures
- Individual operation error isolation
- Partial result collection for successful operations
- Aggregate error reporting

## Deployment Configuration

### SAM Template Requirements
- Lambda function with durable execution configuration
- Appropriate IAM permissions for durable execution
- Environment variables for configuration
- Optional CloudWatch logging

### Function Configuration
- Runtime: Node.js 22.x
- Architecture: ARM64
- Memory: 1024 MB
- Timeout: 15 minutes (function timeout)
- Durable Execution Timeout: 1 hour
- Retention Period: 7 days

### Required Permissions
- `lambda:InvokeFunction` (for durable execution service)
- `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`
- Basic Lambda execution role permissions