const { main } = require('.');

test('results have a greeting and details property', () => {
  const result = main({
    name: 'name',
    place: 'place',
    children: 'children',
    height: 'height',
  });
  expect(result).toHaveProperty('greeting');
  expect(result).toHaveProperty('details');
});
