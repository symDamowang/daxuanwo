export function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

export function badRequest(message: string) {
  return json({ error: message }, { status: 400 });
}

export async function readJson<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}
