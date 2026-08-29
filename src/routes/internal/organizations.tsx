import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminCreateOrgFn, adminOrganizationsFn } from "@/fn/session";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/field";
import { ORGANIZATION_TYPES } from "@/lib/constants";
import type { OrganizationType } from "@/lib/types";

export const Route = createFileRoute("/internal/organizations")({
  component: OrganizationsPage,
});

function OrganizationsPage() {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["admin-orgs"],
    queryFn: () => adminOrganizationsFn(),
  });
  const [organizationName, setOrganizationName] = useState("");
  const [organizationType, setOrganizationType] = useState<OrganizationType>("dealership");
  const create = useMutation({
    mutationFn: () => adminCreateOrgFn({ data: { organizationName, organizationType } }),
    onSuccess: async () => {
      setOrganizationName("");
      await client.invalidateQueries({ queryKey: ["admin-orgs"] });
    },
  });

  return (
    <div>
      <PageHeader
        title="Organizations"
        description="Future dealerships, lenders, fleets, and title agencies. Fictional seed records are labeled."
      />
      <Card className="mb-4">
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate();
          }}
        >
          <div className="flex-1">
            <Label htmlFor="org">Organization name</Label>
            <Input
              id="org"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="type">Type</Label>
            <Select
              id="type"
              value={organizationType}
              onChange={(e) => setOrganizationType(e.target.value as OrganizationType)}
            >
              {ORGANIZATION_TYPES.map((item) => (
                <option key={item} value={item}>
                  {item.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" disabled={create.isPending}>
            Add
          </Button>
        </form>
      </Card>
      <Card>
        {query.error ? (
          <p className="text-sm text-danger">
            {query.error instanceof Error ? query.error.message : "Not authorized"}
          </p>
        ) : (
          <div className="space-y-2">
            {query.data?.map((org) => (
              <div key={org.id} className="flex items-center justify-between rounded-md bg-stone px-3 py-3">
                <div>
                  <p className="font-medium">{org.organizationName}</p>
                  <p className="text-xs text-muted">{org.organizationType.replaceAll("_", " ")}</p>
                </div>
                <div className="flex items-center gap-2">
                  {org.isDevelopmentData ? <Badge tone="warning">Development Data</Badge> : null}
                  <Badge>{org.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
