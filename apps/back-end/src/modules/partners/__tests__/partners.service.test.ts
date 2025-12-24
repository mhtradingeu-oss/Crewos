import { partnersService } from "../partners.service.js";
import { partnersRepository } from "../../../core/db/repositories/partners.repository.js";

const basePartner = {
  id: "partner-1",
  brandId: "brand-abc",
} as const;

const now = new Date();

afterEach(() => {
  jest.restoreAllMocks();
});

describe("partners service", () => {
  it("creates a partner under the requested brand and normalizes location", async () => {
    const createInput = {
      brandId: basePartner.brandId,
      type: "RESELLER" as const,
      name: "North Star",
      country: "  United  States  ",
      city: "New   York ",
      tierId: "tier-gold",
      status: "ACTIVE" as const,
    };

    jest.spyOn(partnersRepository, "getBrandById").mockResolvedValue({ id: createInput.brandId } as any);
    jest
      .spyOn(partnersRepository, "getTierForBrand")
      .mockResolvedValue({ id: createInput.tierId, brandId: createInput.brandId } as any);
    jest.spyOn(partnersRepository, "findPartnerByName").mockResolvedValue(null);

    const createdPartner = {
      ...basePartner,
      type: createInput.type,
      name: createInput.name,
      country: "United States",
      city: "New York",
      status: "ACTIVE",
      tierId: createInput.tierId,
      tier: { name: "Gold" },
      createdAt: now,
      updatedAt: now,
    };

    const createSpy = jest.spyOn(partnersRepository, "createPartner").mockResolvedValue(createdPartner as any);

    const result = await partnersService.create(createInput);

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        brand: { connect: { id: createInput.brandId } },
        country: "United States",
        city: "New York",
        tier: { connect: { id: createInput.tierId } },
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: createdPartner.id,
        brandId: createdPartner.brandId,
        country: createdPartner.country,
        city: createdPartner.city,
        tierId: createdPartner.tierId,
      }),
    );
  });

  describe("partner contracts", () => {
    const contractTerms = { clauses: ["deliver"] };
    const contractRow = {
      id: "contract-1",
      partnerId: basePartner.id,
      startDate: "2025-01-01T00:00:00.000Z",
      endDate: null,
      termsJson: JSON.stringify(contractTerms),
      createdAt: now,
      updatedAt: now,
      partner: { brandId: basePartner.brandId },
    };

    it("serializes terms when creating a contract", async () => {
      jest.spyOn(partnersRepository, "getPartnerMinimal").mockResolvedValue(basePartner as any);
      const contractSpy = jest
        .spyOn(partnersRepository, "createOrUpdatePartnerContractAtomic")
        .mockResolvedValue(contractRow as any);

      const result = await partnersService.createPartnerContract({
        partnerId: basePartner.id,
        brandId: basePartner.brandId,
        terms: contractTerms,
      });

      expect(contractSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          contractId: null,
          data: expect.objectContaining({
            termsJson: JSON.stringify(contractTerms),
          }),
        }),
      );
      expect(result.terms).toEqual(contractTerms);
    });

    it("updates a contract while preserving JSON terms", async () => {
      const updatedTerms = { clauses: ["deliver", "measure"] };
      const contractBefore = { ...contractRow, termsJson: JSON.stringify(contractTerms) };
      jest.spyOn(partnersRepository, "getPartnerMinimal").mockResolvedValue(basePartner as any);
      jest.spyOn(partnersRepository, "getPartnerContract").mockResolvedValue(contractBefore as any);
      const contractSpy = jest
        .spyOn(partnersRepository, "createOrUpdatePartnerContractAtomic")
        .mockResolvedValue({ ...contractRow, termsJson: JSON.stringify(updatedTerms) } as any);

      const result = await partnersService.updatePartnerContract(
        contractRow.id,
        basePartner.id,
        basePartner.brandId,
        { terms: updatedTerms, startDate: "2025-02-01" },
      );

      expect(contractSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          contractId: contractRow.id,
          data: expect.objectContaining({
            termsJson: JSON.stringify(updatedTerms),
          }),
        }),
      );
      expect(result.terms).toEqual(updatedTerms);
    });
  });

  describe("pricing upsert", () => {
    const productId = "product-9";

    it("enforces brand ownership before upserting pricing", async () => {
      jest.spyOn(partnersRepository, "getPartnerMinimal").mockResolvedValue(basePartner as any);
      jest.spyOn(partnersRepository, "getProductForBrand").mockResolvedValue({ id: productId, brandId: basePartner.brandId } as any);
      jest.spyOn(partnersRepository, "getBrandCurrency").mockResolvedValue({ defaultCurrency: "EUR" } as any);
      const upsertSpy = jest
        .spyOn(partnersRepository, "upsertPartnerPricingAtomic")
        .mockResolvedValue({
          id: "pricing-1",
          partnerId: basePartner.id,
          productId,
          netPrice: 120,
          currency: "EUR",
          createdAt: now,
          updatedAt: now,
        } as any);

      const result = await partnersService.upsertPartnerPricing({
        partnerId: basePartner.id,
        brandId: basePartner.brandId,
        productId,
        netPrice: 120,
      });

      expect(upsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          partnerId: basePartner.id,
          productId,
          netPrice: 120,
          currency: "EUR",
        }),
      );
      expect(result.currency).toBe("EUR");
    });

    it("rejects pricing upserts when the product is not part of the brand", async () => {
      jest.spyOn(partnersRepository, "getPartnerMinimal").mockResolvedValue(basePartner as any);
      jest.spyOn(partnersRepository, "getProductForBrand").mockResolvedValue(null);

      await expect(
        partnersService.upsertPartnerPricing({
          partnerId: basePartner.id,
          brandId: basePartner.brandId,
          productId,
          netPrice: 90,
        }),
      ).rejects.toThrow("Product not found for this brand");
    });
  });

  describe("partner users", () => {
    it("attaches an existing user to the partner", async () => {
      const userId = "user-42";
      jest.spyOn(partnersRepository, "getPartnerMinimal").mockResolvedValue(basePartner as any);
      jest.spyOn(partnersRepository, "getUserById").mockResolvedValue({ id: userId } as any);
      jest.spyOn(partnersRepository, "getPartnerUserByPartnerAndUser").mockResolvedValue(null);
      const attachSpy = jest
        .spyOn(partnersRepository, "attachUserToPartnerAtomic")
        .mockResolvedValue({
          id: "partner-user-1",
          userId,
          partnerId: basePartner.id,
          role: "PARTNER_ADMIN",
          user: { email: "lead@example.com" },
          createdAt: now,
          updatedAt: now,
        } as any);

      const result = await partnersService.createPartnerUser(basePartner.id, basePartner.brandId, {
        userId,
        role: "PARTNER_ADMIN",
      });

      expect(attachSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          partnerId: basePartner.id,
          role: "PARTNER_ADMIN",
        }),
      );
      expect(result.userEmail).toBe("lead@example.com");
    });

    it("removes a partner user after validating partner scope", async () => {
      const partnerUserId = "partner-user-2";
      jest.spyOn(partnersRepository, "getPartnerMinimal").mockResolvedValue(basePartner as any);
      jest
        .spyOn(partnersRepository, "getPartnerUser")
        .mockResolvedValue({ id: partnerUserId, partnerId: basePartner.id } as any);
      const deleteSpy = jest.spyOn(partnersRepository, "deletePartnerUser").mockResolvedValue({ id: partnerUserId } as any);

      const result = await partnersService.deactivatePartnerUser(
        basePartner.id,
        basePartner.brandId,
        partnerUserId,
      );

      expect(deleteSpy).toHaveBeenCalledWith(partnerUserId);
      expect(result.id).toBe(partnerUserId);
    });
  });
});
