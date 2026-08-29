import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { updateProfileFn } from "@/fn/session";
import { useSessionSnapshot } from "@/hooks/use-session-snapshot";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, Input, Label, Select } from "@/components/ui/field";
import { US_STATES } from "@/lib/constants";

export const Route = createFileRoute("/app/profile")({ component: ProfilePage });

function ProfilePage() {
  const { snapshot, refetch } = useSessionSnapshot();
  const profile = snapshot?.profile;
  const [firstName, setFirstName] = useState(profile?.firstName ?? "");
  const [lastName, setLastName] = useState(profile?.lastName ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [state, setState] = useState(profile?.state ?? "");
  const [notificationPreference, setNotificationPreference] = useState(
    profile?.notificationPreference ?? "email",
  );
  const [message, setMessage] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () =>
      updateProfileFn({
        data: { firstName, lastName, phone, state, notificationPreference },
      }),
    onSuccess: async () => {
      setMessage("Profile saved.");
      await refetch();
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : "Could not save");
    },
  });

  return (
    <div>
      <PageHeader title="Profile" description="Basic account details only. Government identity numbers are not collected." />
      <Card className="max-w-xl">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="first">First name</Label>
              <Input id="first" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="last">Last name</Label>
              <Input id="last" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Email</Label>
            <Input value={snapshot?.email ?? ""} disabled />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="state">State</Label>
            <Select id="state" value={state} onChange={(e) => setState(e.target.value)}>
              <option value="">Select</option>
              {US_STATES.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="notify">Notifications</Label>
            <Select
              id="notify"
              value={notificationPreference}
              onChange={(e) => setNotificationPreference(e.target.value as "email" | "sms" | "none")}
            >
              <option value="email">Email</option>
              <option value="sms">SMS (later)</option>
              <option value="none">None</option>
            </Select>
          </div>
          {message ? <p className="text-sm">{message}</p> : null}
          {save.error ? (
            <FieldError>
              {save.error instanceof Error ? save.error.message : "Could not save"}
            </FieldError>
          ) : null}
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save profile"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
