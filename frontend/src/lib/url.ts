export const apiBase = process.env.NEXT_PUBLIC_API_BASE!;   // e.g. http://localhost:3001/api
export const backendOrigin = new URL(apiBase).origin;       // -> http://localhost:3001
export const assetUrl = (p?: string) =>
  !p ? "" : p.startsWith("http") ? p : `${backendOrigin}${p}`;
