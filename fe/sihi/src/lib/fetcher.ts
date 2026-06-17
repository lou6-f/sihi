/**
 * SWR fetcher dùng chung — throws on non-OK response (SWR error handling)
 */
export const fetcher = async <T = unknown>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error(`API error: ${res.status}`);
    (err as Error & { status: number }).status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
};
