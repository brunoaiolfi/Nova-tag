export interface Transport {
  send(
    baseUrl: string,
    path: string,
    options?: {token?: string; body?: unknown; method?: string},
  ): Promise<unknown>;
}
