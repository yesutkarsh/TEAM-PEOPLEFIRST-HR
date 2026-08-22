/** Health check — HTTP Client connected to Next.js API. */
import type { ApiResponse } from "../types/api";
import { request } from "./client";

export interface HealthResponse {
  status: string;
  timestamp: string;
  database: string;
  uptime: number;
}

export const healthApi = {
  async checkHealth(): Promise<ApiResponse<HealthResponse>> {
    return request<HealthResponse>("/api/health", {
      method: "GET",
    });
  },
};
