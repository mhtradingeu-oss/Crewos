import type { AutomationActionAdapter } from "@mh-os/shared";

export const logAction: AutomationActionAdapter<{ message: string }> = {
  key: "LOG",

  async execute(_payload, _context) {
    return {
      actionKey: "LOG",
      status: "SUCCESS",
    };
  },
};
