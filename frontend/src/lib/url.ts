export const apiBase =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "http://localhost:3001/api";

export const backendOrigin = new URL(apiBase).origin;
export const assetUrl = (p?: string) =>
  !p ? "" : p.startsWith("http") ? p : `${backendOrigin}${p}`;
