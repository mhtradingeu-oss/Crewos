// All domain types have been moved to @mh-os/shared. Only UI/View/Props types may remain here.
//

export interface UpdateOperationsTaskInput {
  title?: string;
  status?: string;
  dueDate?: Date | null;
}

export interface OperationsEventPayload {
  brandId?: string;
  taskId?: string;
  action?: "created" | "updated" | "deleted" | string;
  metadata?: Record<string, unknown> | null;
  userId?: string;
}
