import { pack } from '../../packages/runtime/src/helpers/pack'

it('pack', () => {
  expect(pack([], 0)).toEqual([])
  expect(pack([{ value: '10', weight: 10 }], 100)).toEqual([['10']])
  expect(
    pack(
      [
        { value: '10', weight: 10 },
        { value: '20', weight: 20 },
        { value: '100', weight: 100 },
      ],
      50,
    ),
  ).toEqual([['100'], ['20', '10']])
})
