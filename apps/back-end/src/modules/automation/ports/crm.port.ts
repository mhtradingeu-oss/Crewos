export interface CrmClient {
  updateEntity(input: {
    entity: "lead" | "contact" | "customer";
    entityId: string;
    changes: Record<string, unknown>;
  }): Promise<void>;
}
