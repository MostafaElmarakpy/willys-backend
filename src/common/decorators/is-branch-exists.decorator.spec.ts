import { Test, type TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { Branch } from "../../database/entities/branch.entity";
import { BranchExistsRule } from "./is-branch-exists.decorator";

describe("BranchExistsRule", () => {
  let rule: BranchExistsRule;
  let branchRepository: jest.Mocked<Repository<Branch>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BranchExistsRule,
        {
          provide: getRepositoryToken(Branch),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    rule = module.get<BranchExistsRule>(BranchExistsRule);
    branchRepository = module.get(getRepositoryToken(Branch));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("validate", () => {
    it("should return true when branch exists", async () => {
      const branchId = "branch-123";
      const mockBranch = {
        id: branchId,
        name: "Test Branch",
      } as unknown as Branch;

      branchRepository.findOne.mockResolvedValue(mockBranch);

      const result = await rule.validate(branchId);

      expect(result).toBe(true);
      expect(branchRepository.findOne).toHaveBeenCalledWith({
        where: { id: branchId },
      });
    });

    it("should return false when branch does not exist", async () => {
      const branchId = "non-existent-branch";

      branchRepository.findOne.mockResolvedValue(null);

      const result = await rule.validate(branchId);

      expect(result).toBe(false);
      expect(branchRepository.findOne).toHaveBeenCalledWith({
        where: { id: branchId },
      });
    });

    it("should return false when branchId is null", async () => {
      const result = await rule.validate(null as any);

      expect(result).toBe(false);
      expect(branchRepository.findOne).not.toHaveBeenCalled();
    });

    it("should return false when branchId is undefined", async () => {
      const result = await rule.validate(undefined as any);

      expect(result).toBe(false);
      expect(branchRepository.findOne).not.toHaveBeenCalled();
    });

    it("should return false when branchId is empty string", async () => {
      const result = await rule.validate("");

      expect(result).toBe(false);
      expect(branchRepository.findOne).not.toHaveBeenCalled();
    });

    it("should return false when repository throws an error", async () => {
      const branchId = "branch-123";

      branchRepository.findOne.mockRejectedValue(new Error("Database error"));

      const result = await rule.validate(branchId);

      expect(result).toBe(false);
    });

    it("should handle UUID format branch IDs", async () => {
      const branchId = "550e8400-e29b-41d4-a716-446655440000";
      const mockBranch = {
        id: branchId,
        name: "Test Branch",
      } as unknown as Branch;

      branchRepository.findOne.mockResolvedValue(mockBranch);

      const result = await rule.validate(branchId);

      expect(result).toBe(true);
      expect(branchRepository.findOne).toHaveBeenCalledWith({
        where: { id: branchId },
      });
    });
  });

  describe("defaultMessage", () => {
    it("should return meaningful error message", () => {
      const args = {
        value: "branch-123",
        property: "branchId",
        targetName: "TestDto",
        object: {},
        constraints: [],
      } as any;

      const message = rule.defaultMessage(args);

      expect(message).toContain("Branch");
      expect(message).toContain("does not exist");
    });
  });
});
