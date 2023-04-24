/**
 * Naïve linear packing algorithm.
 * Takes items with weights, and packs them into boxes of a given threshold.
 * If an item weight exceeds the threshold, it is put into a box of its own.
 * 
 * We're using this to combine many API Routes into fewer Lambda functions.
 * 
 * This does not compute an optimal solution.
 * For that, we'd take the full dependency graph into account
 * and try to pack routes with intersecting dependencies together.
 * But since most of the lambda bundle consists of node_modules,
 * that probably won't help much.
 * In the future, we might think about using some graph-based analysis here!
 * Too complicated for now.
 */
export const pack = <T>(items: { value: T; weight: number }[], threshold: number): T[][] => {
  const result: T[][] = []

  let currentBox: T[] = []
  let currentWeight = 0

  const sortedDescending = items.sort((a, b) => b.weight - a.weight)
  for (const item of sortedDescending) {
    const fitsInCurrentBox = currentWeight + item.weight <= threshold
    if (fitsInCurrentBox) {
      currentBox.push(item.value)
      currentWeight += item.weight
    } else {
      if (currentBox.length !== 0) result.push(currentBox)

      currentBox = [item.value]
      currentWeight = item.weight
    }
  }

  if (currentBox.length !== 0) result.push(currentBox)

  return result
}
