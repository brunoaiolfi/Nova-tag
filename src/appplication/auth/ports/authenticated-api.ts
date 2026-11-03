export interface Api {
  request(
    path: string,
    options?: {
      method?: string;
      body?: unknown;
      expectedUserId?: string;
      expectedBaseUrl?: string;
    },
  ): Promise<unknown>;
}
