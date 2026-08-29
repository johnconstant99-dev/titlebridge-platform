import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listStatesFn } from "@/fn/session";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, Card } from "@/components/ui/card";

export const Route = createFileRoute("/internal/states")({ component: StatesPage });

function StatesPage() {
  const query = useQuery({ queryKey: ["states"], queryFn: () => listStatesFn() });
  return (
    <div>
      <PageHeader
        title="State configuration"
        description="Every capability flag is unverified. TitleBridge makes no legal claim about any jurisdiction."
      />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="py-2 font-medium">State</th>
                <th className="py-2 font-medium">Digital title</th>
                <th className="py-2 font-medium">Electronic registration</th>
                <th className="py-2 font-medium">ELT</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {query.data?.map((state) => (
                <tr key={state.id} className="border-t border-border">
                  <td className="py-2">
                    {state.stateName} ({state.stateCode})
                  </td>
                  <td>
                    <Badge>Unverified / configuration required</Badge>
                  </td>
                  <td>
                    <Badge>Unverified / configuration required</Badge>
                  </td>
                  <td>
                    <Badge>Unverified / configuration required</Badge>
                  </td>
                  <td className="text-muted">
                    {state.configurationStatus.replaceAll("_", " ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
