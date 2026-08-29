import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { createVehicleFn, listVehiclesFn, validateVinFn } from "@/fn/session";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { FieldError, HelperText, Input, Label, Select } from "@/components/ui/field";
import { IDENTITY_NOTICE, US_STATES, VIN_FORMAT_VALIDATED } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

export const Route = createFileRoute("/app/vehicles")({ component: VehiclesPage });

function VehiclesPage() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const vehicles = useQuery({ queryKey: ["vehicles"], queryFn: () => listVehiclesFn() });
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vinHint, setVinHint] = useState<string | null>(null);
  const [vinOk, setVinOk] = useState(false);

  const years = useMemo(() => {
    const now = new Date().getUTCFullYear() + 1;
    return Array.from({ length: now - 1980 }, (_, i) => now - i);
  }, []);

  const create = useMutation({
    mutationFn: (form: FormData) =>
      createVehicleFn({
        data: {
          vin: String(form.get("vin") ?? ""),
          year: String(form.get("year") ?? ""),
          make: String(form.get("make") ?? ""),
          model: String(form.get("model") ?? ""),
          trim: String(form.get("trim") ?? ""),
          color: String(form.get("color") ?? ""),
          plateNumber: String(form.get("plateNumber") ?? ""),
          plateState: String(form.get("plateState") ?? ""),
          odometer: String(form.get("odometer") ?? ""),
        },
      }),
    onSuccess: async (vehicle) => {
      await client.invalidateQueries({ queryKey: ["vehicles"] });
      await navigate({ to: "/app/vehicles/$vehicleId", params: { vehicleId: vehicle.id } });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Could not add vehicle"),
  });

  async function onVinBlur(value: string) {
    if (!value.trim()) {
      setVinHint(null);
      setVinOk(false);
      return;
    }
    try {
      const result = await validateVinFn({ data: { vin: value } });
      setVinOk(result.ok);
      setVinHint(
        result.ok
          ? `${VIN_FORMAT_VALIDATED}. ${result.providerMessage}`
          : result.message,
      );
    } catch (err) {
      setVinOk(false);
      setVinHint(err instanceof Error ? err.message : "Could not validate VIN");
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    create.mutate(new FormData(event.currentTarget));
  }

  return (
    <div>
      <PageHeader
        title="My Vehicles"
        description="Add a vehicle with VIN format validation. TitleBridge does not mark a vehicle verified unless a real provider is connected."
        actions={
          <Button onClick={() => setOpen((value) => !value)}>
            {open ? "Cancel" : "Add Vehicle"}
          </Button>
        }
      />
      <p className="mb-4 text-sm text-muted">{IDENTITY_NOTICE}</p>
      {open ? (
        <Card className="mb-6">
          <h2 className="font-display text-xl">Add Vehicle</h2>
          <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
            <div className="sm:col-span-2">
              <Label htmlFor="vin">VIN</Label>
              <Input
                id="vin"
                name="vin"
                autoComplete="off"
                spellCheck={false}
                required
                onBlur={(e) => void onVinBlur(e.target.value)}
              />
              {vinHint ? (
                <p className={`mt-1 text-sm ${vinOk ? "text-success" : "text-danger"}`}>{vinHint}</p>
              ) : (
                <HelperText>17-character VIN. Invalid letters I, O, and Q are rejected.</HelperText>
              )}
            </div>
            <div>
              <Label htmlFor="year">Year</Label>
              <Select id="year" name="year" required defaultValue="">
                <option value="" disabled>
                  Select year
                </option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="make">Make</Label>
              <Input id="make" name="make" required />
            </div>
            <div>
              <Label htmlFor="model">Model</Label>
              <Input id="model" name="model" required />
            </div>
            <div>
              <Label htmlFor="trim">Trim (optional)</Label>
              <Input id="trim" name="trim" />
            </div>
            <div>
              <Label htmlFor="color">Color (optional)</Label>
              <Input id="color" name="color" />
            </div>
            <div>
              <Label htmlFor="plateNumber">Plate number (optional)</Label>
              <Input id="plateNumber" name="plateNumber" />
            </div>
            <div>
              <Label htmlFor="plateState">Plate state (optional)</Label>
              <Select id="plateState" name="plateState" defaultValue="">
                <option value="">Not provided</option>
                {US_STATES.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.code} — {state.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="odometer">Odometer (optional)</Label>
              <Input id="odometer" name="odometer" inputMode="numeric" />
            </div>
            <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Saving…" : "Save vehicle"}
              </Button>
              <FieldError>{error}</FieldError>
            </div>
          </form>
        </Card>
      ) : null}
      <Card>
        {(vehicles.data ?? []).length === 0 ? (
          <div className="py-10 text-center">
            <p className="font-display text-2xl">No vehicles yet</p>
            <p className="mt-2 text-sm text-muted">Add a vehicle to start ownership records and title cases.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {vehicles.data?.map((item) => (
              <li key={item.id}>
                <Link
                  to="/app/vehicles/$vehicleId"
                  params={{ vehicleId: item.id }}
                  className="flex flex-col gap-1 rounded-md bg-stone px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{item.displayName}</p>
                    <p className="font-mono text-xs text-muted">{item.vinMasked}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={item.vinFormatValid ? "success" : "neutral"}>
                      {item.vinFormatValid ? VIN_FORMAT_VALIDATED : "VIN not validated"}
                    </Badge>
                    <Badge>{item.lienStatus.replaceAll("_", " ")}</Badge>
                    <span className="text-xs text-muted">{formatDateTime(item.createdAt)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
