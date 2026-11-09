"use client";

import type { FeedDetail, FeedItem } from "./feed-types";

async function readApi<T>(path: string): Promise<T> {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load data (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export function getFeeds(): Promise<FeedItem[]> {
  return readApi<FeedItem[]>("/api/feeds");
}

export function getFeed(id: string): Promise<FeedDetail> {
  return readApi<FeedDetail>(`/api/feeds/${encodeURIComponent(id)}`);
}
