import { uploadService } from '../src/services/uploads/upload.service';
import { modelService } from '../src/services/models/model.service';
import { getModelUrl } from '../src/config/aws';

describe('S3 Key / Public Model URL Getter', () => {
  const modelId = 'model-12345';
  const fileName = 'chair.glb';
  const expectedUrl = `https://navish-arc-assets-2026.s3.us-east-1.amazonaws.com/temp/${modelId}/${fileName}`;

  it('should return plain public S3 URL from uploadService.getModelUrl', async () => {
    const url = await uploadService.getModelUrl(modelId, fileName);
    expect(url).toBe(expectedUrl);
  });

  it('should return plain public S3 URL from modelService.getModelUrl', async () => {
    const url = await modelService.getModelUrl(modelId, fileName);
    expect(url).toBe(expectedUrl);
  });

  it('should return plain public S3 URL from aws.getModelUrl', async () => {
    const url = await getModelUrl(modelId, fileName);
    expect(url).toBe(expectedUrl);
  });
});
