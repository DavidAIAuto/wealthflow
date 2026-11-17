"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const CHANGE_EVENT = "finance:data-changed";

/** Tell every mounted `useApi` hook to reload (call after any mutation). */
export function notifyDataChanged() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function api<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(url, {
    ...rest,
    headers: json !== undefined ? { "Content-Type": "application/json", ...rest.headers } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError((data && typeof data.error === "string" && data.error) || `Request failed (${res.status})`, res.status);
  }
  return data as T;
}

/** Fetch JSON from `url` (null = skip), reloading on url change and on global data changes. */
export function useApi<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** The url whose response is currently in `data`/`error`; loading = it differs from `url`. */
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const reqId = useRef(0);

  const load = useCallback((): Promise<void> => {
    if (!url) return Promise.resolve();
    const id = ++reqId.current;
    return api<T>(url).then(
      (d) => {
        if (id !== reqId.current) return; // superseded by a newer request
        setData(d);
        setError(null);
        setLoadedUrl(url);
      },
      (e: unknown) => {
        if (id !== reqId.current) return;
        setError(e instanceof Error ? e.message : String(e));
        setLoadedUrl(url);
      },
    );
  }, [url]);

  const loading = url != null && loadedUrl !== url;

  useEffect(() => {
    void load();
    const onChange = () => void load();
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, [load]);

  return { data, setData, error, loading, reload: load };
}
