export interface UserSession {
  user: {
    userId: number;
    username: string;
    fullName: string;
    role: "Admin" | "Donor" | "Organization" | "Volunteer" | string;
    contactInfo: string;
  };
  donorId?: number;
  donorType?: string;
  orgId?: number;
  orgName?: string;
  location?: string;
  volunteerId?: number;
  vehicleType?: string;
  isAvailable?: boolean;
}

const SESSION_KEY = "drrms_active_session_v1";

export function getSavedSession(): UserSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: UserSession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}

export function getCachedData<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`drrms_cache_${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCachedData<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`drrms_cache_${key}`, JSON.stringify(data));
  } catch {
    // ignore storage quota errors
  }
}

export async function apiFetch<T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  // Cleanly routes through /api/proxy/... which forwards to the Render Java JDBC API
  // or executes the identical atomic PostgreSQL queries on Supabase if Render is cold-starting.
  const cleanPath = endpoint.startsWith("/api/")
    ? endpoint.replace(/^\/api\//, "/api/proxy/")
    : endpoint;

  const res = await fetch(cleanPath, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    cache: "no-store",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data as T;
}
