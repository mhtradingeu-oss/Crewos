import { subscribe } from "../../core/events/event-bus.js";
import { notificationService } from "./notification.service.js";
import { PricingEvents } from "../pricing/pricing.events.js";
import { ProductEvents } from "../product/product.events.js";
import { UserEvents } from "../users/users.events.js";
import { AiBrainEvents } from "../ai-brain/ai-brain.events.js";
import { CrmLeadEvents } from "../crm/crm.events.js";

export function registerNotificationSubscribers() {
  subscribe(PricingEvents.UPDATED, async (event) => {
    try {
      const payload = (event.payload ?? {}) as Record<string, unknown>;
      await notificationService.createNotification({
        brandId: event.context?.brandId,
        type: "pricing",
        title: "Pricing updated",
        message: `Pricing changed for product ${payload.productId ?? ""}`,
        data: { event },
      });
    } catch (err) {
      console.error("[notification] failed pricing update", err);
    }
  });

  subscribe(ProductEvents.CREATED, async (event) => {
    try {
      await notificationService.createNotification({
        brandId: event.context?.brandId,
        type: "product",
        title: "New product",
        message: `Product created`,
        data: { event },
      });
    } catch (err) {
      console.error("[notification] failed product create", err);
    }
  });

  subscribe(UserEvents.CREATED, async (event) => {
    try {
      const payload = (event.payload ?? {}) as Record<string, unknown>;
      await notificationService.createNotification({
        type: "user",
        title: "New user",
        message: `User ${payload.email ?? ""} created`,
        data: { event },
      });
    } catch (err) {
      console.error("[notification] failed user create", err);
    }
  });

  subscribe(AiBrainEvents.CREATED, async (event) => {
    try {
      await notificationService.createNotification({
        brandId: event.context?.brandId,
        type: "ai",
        title: "AI insight",
        message: `AI generated new insight`,
        data: { event },
      });
    } catch (err) {
      console.error("[notification] failed ai insight", err);
    }
  });

  subscribe(CrmLeadEvents.CREATED, async (event) => {
    try {
      const payload = (event.payload ?? {}) as Record<string, unknown>;
      await notificationService.createNotification({
        brandId: event.context?.brandId,
        type: "crm",
        title: "New lead",
        message: `Lead ${payload.leadId ?? "unknown"} created`,
        data: { event },
      });
    } catch (err) {
      console.error("[notification] failed crm lead create", err);
    }
  });

  subscribe(CrmLeadEvents.CONTACTED, async (event) => {
    try {
      const payload = (event.payload ?? {}) as Record<string, unknown>;
      await notificationService.createNotification({
        brandId: event.context?.brandId,
        type: "crm",
        title: "Lead progressed",
        message: `Lead ${payload.leadId ?? "unknown"} became a contact`,
        data: { event },
      });
    } catch (err) {
      console.error("[notification] failed crm lead contact", err);
    }
  });

  subscribe(CrmLeadEvents.CUSTOMER_CREATED, async (event) => {
    try {
      const payload = (event.payload ?? {}) as Record<string, unknown>;
      await notificationService.createNotification({
        brandId: event.context?.brandId,
        type: "crm",
        title: "Lead became customer",
        message: `Lead ${payload.leadId ?? "unknown"} converted to customer`,
        data: { event },
      });
    } catch (err) {
      console.error("[notification] failed crm customer event", err);
    }
  });
}
