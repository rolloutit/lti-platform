import { expect, test } from 'vitest'

test('entry point can be imported', async () => {
  const lib = await import('../src/index.js')
  expect(lib).toBeTypeOf('object')
})
