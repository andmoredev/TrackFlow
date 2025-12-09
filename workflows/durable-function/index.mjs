import { withDurableExecution } from '@aws/durable-execution-sdk-js';
import { processImage } from './lib/image-processor.mjs';
import { saveExecution, saveAlbum, updateAlbum } from './lib/album-repository.mjs';
import { estimatePrice } from './lib/price-estimator.mjs';
import { createValidationTask } from './lib/validation-task-manager.mjs';

export const handler = withDurableExecution(async (event, context) => {
  const { imageS3Key } = event;

  const albums = await context.step('processImage', async () => {
    context.logger.info(`Processing image: ${imageS3Key}`);
    return await processImage(imageS3Key);
  });

  await context.step('saveExecution', async () => {
    context.logger.info(`Saving execution metadata: ${context.executionId}`);
    return await saveExecution(context.executionId, imageS3Key, 'running');
  });

  await context.map(albums, async (album, i) =>
    context.step(`saveAlbum-${i}`, async () => {
      context.logger.info(`Saving album ${album.albumIndex}`);
      return await saveAlbum(context.executionId, album);
    })
  );

  const callbackId = `validation-${context.executionId}`;

  await context.step('createValidationTask', async () => {
    context.logger.info(`Creating validation task for execution ${context.executionId}`);
    return await createValidationTask(context.executionId, imageS3Key, albums, callbackId);
  });

  const validatedData = await context.wait({
    callback: { id: callbackId },
    timeout: { seconds: 3600 }
  });

  if (validatedData && validatedData.albums) {
    await context.map(validatedData.albums, async (validatedAlbum, i) =>
      context.step(`updateValidatedAlbum-${i}`, async () => {
        context.logger.info(`Updating validated album ${validatedAlbum.albumIndex}`);
        return await updateAlbum(context.executionId, {
          albumIndex: validatedAlbum.albumIndex,
          year: validatedAlbum.year,
          yearValidated: true
        });
      })
    );
  }

  const prices = await context.map(albums, async (album, i) =>
    context.step(`estimatePrice-${i}`, async () => {
      context.logger.info(`Estimating price for album ${album.albumIndex}`);
      return await estimatePrice(album);
    })
  );

  await context.map(prices, async (price, i) =>
    context.step(`saveFinalAlbum-${i}`, async () => {
      context.logger.info(`Saving final album ${i + 1} with price`);
      return await updateAlbum(context.executionId, {
        albumIndex: i + 1,
        ...price
      });
    })
  );

  await context.step('completeExecution', async () => {
    context.logger.info(`Completing execution: ${context.executionId}`);
    return await saveExecution(context.executionId, imageS3Key, 'completed');
  });

  return {
    executionId: context.executionId,
    albumCount: albums.length,
    status: 'completed'
  };
});
