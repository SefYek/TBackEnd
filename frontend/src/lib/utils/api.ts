const API_BASE_URL = "http://localhost:8000";

/**
 * Reusable generic API fetch helper.
 * Sends HTTP requests to the backend, handles request/response JSON serialization,
 * and handles HTTP error responses cleanly.
 *
 * @param endpoint - The API route (e.g. "/auth/register" or full URL)
 * @param body - Optional payload object to send as request body
 * @param method - The HTTP verb (default: "POST")
 * @returns Promise parsing response JSON as requested type
 */
export async function apiRequest<TResponse = unknown>(
  endpoint: string,
  body?: unknown,
  method: string = "POST"
): Promise<TResponse> {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const config: RequestInit = {
    method,
    headers,
  };

  if (body !== undefined) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(url, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage =
      errorData && typeof errorData === "object" && "detail" in errorData
        ? String(errorData.detail)
        : `درخواست با کد خطای ${response.status} مواجه شد.`;
    throw new Error(errorMessage);
  }

  // Return empty object for empty responses (e.g., status 204 No Content)
  if (response.status === 204) {
    return {} as TResponse;
  }

  return response.json() as Promise<TResponse>;
}
