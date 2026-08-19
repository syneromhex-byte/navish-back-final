import { uploadService } from '../src/services/uploads/upload.service';
import { modelService } from '../src/services/models/model.service';
import { getModelUrl, generatePresignedUrl, getPermanentS3Url } from '../src/config/aws';

describe('S3 Key / Presigned Model URL Getter', () => {
  const modelId = 'model-12345';
  const fileName = 'chair.glb';

  it('should return presigned GET URL from uploadService.getModelUrl', async () => {
    const url = await uploadService.getModelUrl(modelId, fileName);
    expect(url).toBeDefined();
    expect(url).toContain('models/model-12345/chair.glb');
  });

  it('should return presigned GET URL from modelService.getModelUrl', async () => {
    const url = await modelService.getModelUrl(modelId, fileName);
    expect(url).toBeDefined();
    expect(url).toContain('models/model-12345/chair.glb');
  });

  it('should return presigned GET URL from aws.getModelUrl', async () => {
    const url = await getModelUrl(modelId, fileName);
    expect(url).toBeDefined();
    expect(url).toContain('models/model-12345/chair.glb');
  });

  it('should generate a raw, unencoded presigned URL via generatePresignedUrl', async () => {
    const bucket = 'my-bucket';
    const key = 'models/test-object.glb';
    const signedUrl = await generatePresignedUrl(bucket, key);
    expect(signedUrl).toBeDefined();
    expect(typeof signedUrl).toBe('string');
    expect(signedUrl).not.toContain('https%3A');
    expect(signedUrl).not.toContain('http%3A');
  });

  it('should decode encoded URLs in getPermanentS3Url and return raw http(s) URL', () => {
    const encoded = 'https%3A%2F%2Fnavish-arc-assets-2026.s3.amazonaws.com%2Fmodel.glb';
    const result = getPermanentS3Url(encoded);
    expect(result).toBe('https://navish-arc-assets-2026.s3.amazonaws.com/model.glb');
  });
});
