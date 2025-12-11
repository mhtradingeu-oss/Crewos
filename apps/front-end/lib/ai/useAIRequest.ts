"use client";

import { useState } from "react";
import { api } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";

export function useAIRequest<T = unknown>(path: string) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (payload: unknown) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post<T>(path, payload);
      setData(response.data);
      toast.success("AI insight generated");
      return response.data;
    } catch (err) {
      const message = apiErrorMessage(err);
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { run, data, loading, error };
}
