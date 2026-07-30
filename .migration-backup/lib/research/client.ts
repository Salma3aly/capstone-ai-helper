export function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return { "Content-Type": "application/json" };
  const token = localStorage.getItem("capstone_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function getAuthHeadersOnly(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("capstone_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}
