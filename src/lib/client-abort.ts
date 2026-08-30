// A client that disconnects mid-render surfaces as "aborted"/AbortError. That is
// not an app failure — don't log it or render the 500 page for it.
export function isClientAbortError(error: unknown): boolean {
  if (error == null || typeof error !== "object") return false;
  const { name, message, code } = error as { name?: string; message?: string; code?: string };
  return (
    name === "AbortError" ||
    code === "ECONNRESET" ||
    code === "ERR_STREAM_PREMATURE_CLOSE" ||
    (typeof message === "string" && message.includes("aborted"))
  );
}
