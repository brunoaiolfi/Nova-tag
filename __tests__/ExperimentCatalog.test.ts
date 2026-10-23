import {ExperimentCatalog} from '../src/appplication/experimentation/catalog';
const owner = {userId: 'operator', baseUrl: 'https://api.example/api/v1'};
test('catalog queries carry the expected owner and validate external pages', async () => {
  const request = jest
    .fn()
    .mockResolvedValue({
      items: [
        {
          input: {
            id: 'run',
            name: 'Experiment',
            dataKind: 'FISICO',
            configuration: {timeoutMs: 1000},
          },
        },
      ],
      total: 1,
    });
  const catalog = new ExperimentCatalog({request});
  await expect(catalog.runs(owner)).resolves.toMatchObject({
    items: [{id: 'run'}],
    page: 1,
    total: 1,
  });
  expect(request).toHaveBeenCalledWith('/experimentos?pagina=1&limite=20', {
    expectedUserId: owner.userId,
    expectedBaseUrl: owner.baseUrl,
  });
});
test.each([
  null,
  {},
  {items: [], total: '1'},
  {items: [{input: {id: 'run', configuration: null}}], total: 1},
])('catalog rejects malformed wire data: %p', async response => {
  const catalog = new ExperimentCatalog({
    request: jest.fn().mockResolvedValue(response),
  });
  await expect(catalog.runs(owner)).rejects.toMatchObject({
    code: 'RESPOSTA_INVALIDA',
  });
});
