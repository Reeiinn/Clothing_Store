type TrpcErrorLike = {
  message: string;
  data?: {
    zodError?: { fieldErrors: Record<string, string[] | undefined> } | null;
  } | null;
};

/** Turns a tRPC error into one readable sentence (validation errors included). */
export function errorMessage(error: TrpcErrorLike) {
  const fieldErrors = error.data?.zodError?.fieldErrors;
  const first = fieldErrors ? Object.values(fieldErrors).flat()[0] : undefined;
  return first ?? error.message;
}
