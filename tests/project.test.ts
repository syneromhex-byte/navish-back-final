import { formatProjectResponse } from '../src/repositories/project.repository';

describe('Project Response Formatting', () => {
  it('should include modelId, model_id, fileUrl, and modelUrl when provided in metadata', () => {
    const rawProject = {
      id: 'f63a4325-168c-49d1-a1b8-de8247477100',
      name: 'My Project',
      metadata: {
        modelId: '650b76b2-8e5d-4dba-8bcb-df91f60b13ad',
        fileUrl: 'https://navish-arc-assets-2026.s3.amazonaws.com/650b76b2.glb',
      },
    };

    const formatted = formatProjectResponse(rawProject);

    expect(formatted).toEqual(
      expect.objectContaining({
        id: 'f63a4325-168c-49d1-a1b8-de8247477100',
        name: 'My Project',
        modelId: '650b76b2-8e5d-4dba-8bcb-df91f60b13ad',
        model_id: '650b76b2-8e5d-4dba-8bcb-df91f60b13ad',
        fileUrl: 'https://navish-arc-assets-2026.s3.amazonaws.com/650b76b2.glb',
        modelUrl: 'https://navish-arc-assets-2026.s3.amazonaws.com/650b76b2.glb',
      })
    );
  });

  it('should resolve modelId and fileUrl from room models relation when metadata is empty', () => {
    const rawProject = {
      id: 'f63a4325-168c-49d1-a1b8-de8247477100',
      name: 'My Project',
      rooms: [
        {
          id: 'room-1',
          models: [
            {
              modelId: '650b76b2-8e5d-4dba-8bcb-df91f60b13ad',
              model: {
                id: '650b76b2-8e5d-4dba-8bcb-df91f60b13ad',
                publicUrl: 'https://navish-arc-assets-2026.s3.amazonaws.com/650b76b2.glb',
              },
            },
          ],
        },
      ],
    };

    const formatted = formatProjectResponse(rawProject);

    expect(formatted).toEqual(
      expect.objectContaining({
        id: 'f63a4325-168c-49d1-a1b8-de8247477100',
        name: 'My Project',
        modelId: '650b76b2-8e5d-4dba-8bcb-df91f60b13ad',
        model_id: '650b76b2-8e5d-4dba-8bcb-df91f60b13ad',
        fileUrl: 'https://navish-arc-assets-2026.s3.amazonaws.com/650b76b2.glb',
        modelUrl: 'https://navish-arc-assets-2026.s3.amazonaws.com/650b76b2.glb',
      })
    );
  });
});
