import { uploadService } from '../src/services/uploads/upload.service';
import { modelService } from '../src/services/models/model.service';
import { getModelUrl } from '../src/config/aws';

describe('S3 Key / Presigned Model URL Getter', () => {
  const modelId = 'model-12345';
  const fileName = 'chair.glb';

  it('should return temp/${modelId}/${fileName} from uploadService.getModelUrl', async () => {
    const url = await uploadService.getModelUrl(modelId, fileName);
    expect(url).toBe(`temp/${modelId}/${fileName}`);
  });

  it('should return temp/${modelId}/${fileName} from modelService.getModelUrl', async () => {
    const url = await modelService.getModelUrl(modelId, fileName);
    expect(url).toBe(`temp/${modelId}/${fileName}`);
  });

  it('should return temp/${modelId}/${fileName} from aws.getModelUrl', async () => {
    const url = await getModelUrl(modelId, fileName);
    expect(url).toBe(`temp/${modelId}/${fileName}`);
  });
});
