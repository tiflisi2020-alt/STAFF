export function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

export function searchTerm(value: string) {
  return value.replace(/[%_,.()]/g, " ").trim();
}
