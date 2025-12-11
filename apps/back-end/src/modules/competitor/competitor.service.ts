import type {
  CompetitorPriceRecord,
  GetCompetitorPricesInput,
  ScanCompetitorsInput,
  ScanResult,
} from "./competitor.dto.js";
import { buildPagination } from "../../core/utils/pagination.js";

/**
 * Minimal competitor service skeleton.
 * TODO: replace stub implementations with real intelligence integrations.
 */
export const competitorService = {
  async scanCompetitors(_: ScanCompetitorsInput): Promise<ScanResult> {
    return {
      items: [],
      message: "TODO: implement competitor scanning",
      total: 0,
      page: 1,
      pageSize: 0,
    };
  },

  async getCompetitorPrices(
    params: GetCompetitorPricesInput,
  ): Promise<{ items: CompetitorPriceRecord[]; total: number; page: number; pageSize: number }> {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(params.pageSize ?? 20, 100);
    const { skip, take } = buildPagination({ page, pageSize });
    // TODO: replace stubbed data source with real query once telemetry is integrated.
    return { items: [], total: 0, page, pageSize: take };
  },
};
