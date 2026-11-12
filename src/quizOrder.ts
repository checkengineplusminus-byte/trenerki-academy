export function shuffled<T>(values: readonly T[]): T[] {
  const order = [...values]
  for (let index = order.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1))
    const value = order[index]
    order[index] = order[other]
    order[other] = value
  }
  return order
}

export function optionOrder(count: number): number[] {
  return shuffled(Array.from({ length: count }, (_, index) => index))
}
