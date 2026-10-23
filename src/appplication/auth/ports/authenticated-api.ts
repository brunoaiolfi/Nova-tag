export interface Api {
  request<T>(
    path: string,
    options?: {
      method?: string;
      body?: unknown;
      expectedUserId?: string;
      expectedBaseUrl?: string;
    },
  ): Promise<T>;
}
