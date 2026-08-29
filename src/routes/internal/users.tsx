import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminAssignRoleFn, adminRemoveRoleFn, adminUsersFn } from "@/fn/session";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { ASSIGNABLE_ROLES, ROLE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { AssignableRole } from "@/lib/types";

export const Route = createFileRoute("/internal/users")({ component: UsersPage });

function UsersPage() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["admin-users"], queryFn: () => adminUsersFn() });
  const [role, setRole] = useState<AssignableRole>("OPERATIONS");
  const assign = useMutation({
    mutationFn: (userId: string) => adminAssignRoleFn({ data: { userId, role } }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["admin-users"] }),
  });
  const remove = useMutation({
    mutationFn: (payload: { userId: string; role: string }) => adminRemoveRoleFn({ data: payload }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  return (
    <div>
      <PageHeader
        title="Users"
        description="Administrators may assign CUSTOMER, OPERATIONS, COMPLIANCE, and ADMIN. SUPER_ADMIN is reserved and cannot be assigned here."
      />
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm">Assign role</span>
          <Select value={role} onChange={(e) => setRole(e.target.value as AssignableRole)}>
            {ASSIGNABLE_ROLES.map((item) => (
              <option key={item} value={item}>
                {ROLE_LABELS[item]}
              </option>
            ))}
          </Select>
        </div>
        {query.error ? (
          <p className="text-sm text-danger">
            {query.error instanceof Error ? query.error.message : "Not authorized"}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="py-2 font-medium">Name</th>
                  <th className="py-2 font-medium">State</th>
                  <th className="py-2 font-medium">Roles</th>
                  <th className="py-2 font-medium">Joined</th>
                  <th className="py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {query.data?.map((user) => (
                  <tr key={user.userId} className="border-t border-border">
                    <td className="py-3">
                      {user.firstName} {user.lastName}
                    </td>
                    <td>{user.state ?? "—"}</td>
                    <td className="space-x-1">
                      {user.roles.map((item) => (
                        <Badge key={item} tone="pine">
                          {item}
                        </Badge>
                      ))}
                    </td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td className="space-x-2">
                      <Button size="sm" variant="secondary" onClick={() => assign.mutate(user.userId)}>
                        Assign
                      </Button>
                      {role !== "CUSTOMER" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => remove.mutate({ userId: user.userId, role })}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {assign.error ? (
          <p className="mt-3 text-sm text-danger">
            {assign.error instanceof Error ? assign.error.message : "Role change failed"}
          </p>
        ) : null}
      </Card>
    </div>
  );
}
