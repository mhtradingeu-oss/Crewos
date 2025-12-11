import test from "node:test";
import assert from "node:assert/strict";
import { XRECHNUNG_SKELETON, buildValidationPromptPayload } from "../einvoice.prompts.js";
import {
  generateEInvoiceSchema,
  sendEInvoiceSchema,
  validateEInvoiceSchema,
} from "../../../../modules/finance/einvoice.validators.js";
import * as controller from "../../../../modules/finance/einvoice.controller.js";
import { ApiError } from "../../../http/errors.js";

function mockResponse() {
  const res: any = {};
  res.statusCode = 200;
  res.body = undefined;
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload: unknown) => {
    res.body = payload;
    return res;
  };
  return res;
}

function mockRequest(body: any = {}, params: any = {}, query: any = {}, user: any = {}) {
  return { body, params, query, user } as any;
}

test("XML generation skeleton contains EN 16931 structure", () => {
  assert.ok(XRECHNUNG_SKELETON.includes("CrossIndustryInvoice"));
  assert.ok(XRECHNUNG_SKELETON.includes("GrandTotalAmount"));
});

test("Validation prompt enforces monetary safety", () => {
  const prompt = buildValidationPromptPayload("XRECHNUNG", "<xml>demo</xml>");
  assert.ok(prompt.includes("Never correct monetary totals"));
  assert.ok(prompt.includes("EN 16931"));
});

test("Schemas guard required fields", () => {
  assert.equal(generateEInvoiceSchema.safeParse({ invoiceId: "abc", format: "XRECHNUNG" }).success, true);
  assert.equal(validateEInvoiceSchema.safeParse({ invoiceId: "abc", format: "XRECHNUNG", xml: "<x/>" }).success, true);
  assert.equal(sendEInvoiceSchema.safeParse({ invoiceId: "abc", format: "ZUGFERD" }).success, true);
  assert.equal(sendEInvoiceSchema.safeParse({ invoiceId: "", format: "ZUGFERD" }).success, false);
});

test("Controller returns validation error for bad request", async () => {
  const req = mockRequest({}, {}, {}, { id: "u1", role: "USER" });
  const res = mockResponse();
  let captured: unknown;
  const next = (err?: unknown) => {
    captured = err;
  };
  await controller.generate(req, res as any, next as any);
  assert.ok(captured instanceof ApiError);
  assert.equal((captured as ApiError).status, 400);
});
