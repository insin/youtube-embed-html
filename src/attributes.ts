const booleanAttributes = new Set([
  'allowfullscreen', 'allowpaymentrequest', 'credentialless', 'hidden', 'inert', 'itemscope',
])

export function serializeAttributeValue(name: string, value: string | number | boolean): string | null {
  if (typeof value === 'boolean' && booleanAttributes.has(name)) return value ? '' : null
  return String(value)
}
