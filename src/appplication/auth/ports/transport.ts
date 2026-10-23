export interface Transport {
  send<T>(
    baseUrl: string,
    path: string,
    options?: {token?: string; body?: unknown; method?: string},
  ): Promise<T>;
}
