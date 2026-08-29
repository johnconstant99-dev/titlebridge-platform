import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  allowedStatusChange,
  can,
  canAccessCase,
  canAssignRole,
  canSeeInternalNote,
  nextCaseStatusForReview,
  publicProfileView,
  validateRoleAssignment,
} from "./rbac.ts";

describe("rbac", () => {
  it("never lets a customer read another customer's case", () => {
    assert.equal(
      canAccessCase({
        actorId: "user-a",
        actorRoles: ["CUSTOMER"],
        customerId: "user-b",
      }),
      false,
    );
  });

  it("lets a customer read their own case", () => {
    assert.equal(
      canAccessCase({
        actorId: "user-a",
        actorRoles: ["CUSTOMER"],
        customerId: "user-a",
      }),
      true,
    );
  });

  it("lets operations review any case", () => {
    assert.equal(
      canAccessCase({
        actorId: "ops-1",
        actorRoles: ["OPERATIONS"],
        customerId: "user-b",
      }),
      true,
    );
  });

  it("hides internal notes from customers", () => {
    assert.equal(canSeeInternalNote(["CUSTOMER"]), false);
    assert.equal(canSeeInternalNote(["OPERATIONS"]), true);
  });

  it("blocks customers from admin permissions", () => {
    assert.equal(can(["CUSTOMER"], "user:manage"), false);
    assert.equal(can(["CUSTOMER"], "audit:read"), false);
    assert.equal(can(["CUSTOMER"], "settings:manage"), false);
    assert.equal(can(["CUSTOMER"], "internal:access"), false);
    assert.equal(can(["CUSTOMER"], "review:act"), false);
    assert.equal(can(["CUSTOMER"], "vehicle:read:any"), false);
    assert.equal(can(["CUSTOMER"], "document:read:any"), false);
  });

  it("never allows assigning SUPER_ADMIN", () => {
    assert.equal(canAssignRole(["ADMIN"], "SUPER_ADMIN"), false);
    assert.equal(canAssignRole(["SUPER_ADMIN"], "SUPER_ADMIN"), false);
    const result = validateRoleAssignment(["SUPER_ADMIN"], "SUPER_ADMIN");
    assert.equal(result.ok, false);
  });

  it("lets admins assign operations but not customers manage users", () => {
    assert.equal(canAssignRole(["ADMIN"], "OPERATIONS"), true);
    assert.equal(can(["CUSTOMER"], "role:assign"), false);
  });

  it("restricts operations status changes", () => {
    assert.equal(allowedStatusChange(["OPERATIONS"], "under_review"), true);
    assert.equal(allowedStatusChange(["OPERATIONS"], "completed"), false);
    assert.equal(allowedStatusChange(["ADMIN"], "completed"), true);
    assert.equal(allowedStatusChange(["CUSTOMER"], "under_review"), false);
  });

  it("isolates profile reads", () => {
    assert.equal(
      publicProfileView({
        actorId: "a",
        actorRoles: ["CUSTOMER"],
        profileUserId: "b",
      }),
      false,
    );
    assert.equal(
      publicProfileView({
        actorId: "a",
        actorRoles: ["CUSTOMER"],
        profileUserId: "a",
      }),
      true,
    );
  });

  it("lets operations assign cases but not flag compliance", () => {
    assert.equal(can(["OPERATIONS"], "case:assign"), true);
    assert.equal(can(["OPERATIONS"], "compliance:review"), false);
    assert.equal(can(["OPERATIONS"], "review:act"), true);
  });

  it("lets compliance review and flag, but not assign", () => {
    assert.equal(can(["COMPLIANCE"], "review:act"), true);
    assert.equal(can(["COMPLIANCE"], "compliance:review"), true);
    assert.equal(can(["COMPLIANCE"], "case:assign"), false);
    assert.equal(can(["COMPLIANCE"], "case:status:update"), false);
  });

  it("blocks customers from review, assignment, and any-vehicle reads", () => {
    assert.equal(can(["CUSTOMER"], "review:act"), false);
    assert.equal(can(["CUSTOMER"], "case:assign"), false);
    assert.equal(can(["CUSTOMER"], "vehicle:read:any"), false);
    assert.equal(can(["CUSTOMER"], "document:read:any"), false);
  });

  it("does not let operations complete a title case from internal review", () => {
    assert.equal(
      nextCaseStatusForReview({
        actorRoles: ["OPERATIONS"],
        action: "approved",
        section: "case",
        currentStatus: "under_review",
      }),
      "ready_for_submission",
    );
    assert.equal(
      nextCaseStatusForReview({
        actorRoles: ["ADMIN"],
        action: "approved",
        section: "case",
        currentStatus: "under_review",
      }),
      "completed",
    );
    assert.equal(
      nextCaseStatusForReview({
        actorRoles: ["COMPLIANCE"],
        action: "approved",
        section: "case",
        currentStatus: "under_review",
      }),
      null,
    );
  });

  it("maps review assignment and info-request onto permitted statuses", () => {
    assert.equal(
      nextCaseStatusForReview({
        actorRoles: ["OPERATIONS"],
        action: "assigned",
        section: "case",
        currentStatus: "draft",
      }),
      "under_review",
    );
    assert.equal(
      nextCaseStatusForReview({
        actorRoles: ["COMPLIANCE"],
        action: "reassigned",
        section: "case",
        currentStatus: "under_review",
      }),
      "under_review",
    );
    assert.equal(
      nextCaseStatusForReview({
        actorRoles: ["OPERATIONS"],
        action: "info_requested",
        section: "documents",
        currentStatus: "under_review",
      }),
      "awaiting_customer",
    );
  });
});
