export function fakeAdd(num1: number, num2: number) {
  return num1 + num2
}

export function fakeHello(name?: string) {
  return `Hello ${name ?? 'unknown'}!`
}

type DateData = {month: number; day: number; year: number}

export function createLocaleDate({month, day, year}: DateData) {
  return new Date(year, month, day).toLocaleDateString()
}

export function createDateString({month, day, year}: DateData) {
  return new Date(year, month, day).toDateString()
}

export function errorToObject(err?: Error): Record<string, string> | null {
  if (!err || !(err instanceof Error)) return null

  const obj: Record<string, string> = {}

  Object.getOwnPropertyNames(err).forEach(prop => {
    const value = err[prop as keyof Error]

    if (typeof value !== 'string') return

    obj[prop] = value
  })

  return obj
}
