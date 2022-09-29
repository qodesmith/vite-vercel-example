export function fakeAdd(num1: number, num2: number) {
  return num1 + num2
}

export function fakeHello(name?: string) {
  return `Hello ${name ?? 'unknown'}!`
}
