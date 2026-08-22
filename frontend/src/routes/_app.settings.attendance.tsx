import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Alert, Badge, Button, Card, EmptyState, Input, Select, Spinner, Textarea, TimePicker, Toggle, showToast,
} from "@/lib/components/ui";
import { PermissionGuard } from "@/lib/components/rbac";
import { attendanceApi } from "@/lib/api/attendance";
import type { AttendanceSettings, GeoFence } from "@/lib/types/attendance";

export const Route = createFileRoute("/_app/settings/attendance")({
  component: SettingsAttendancePage,
  pendingComponent: () => <div className="flex justify-center py-20"><Spinner size={28} /></div>,
  head: () => ({
    meta: [
      { title: "Attendance Settings — HRMS" },
      { name: "description", content: "Configure shift timings, grace periods, geo-fencing and clock-in rules." },
      { property: "og:title", content: "Attendance Settings — HRMS" },
      { property: "og:description", content: "Configure shift timings, grace periods, geo-fencing and clock-in rules." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const CAPTURE_MODE_OPTIONS = [
  { value: "web", label: "Web clock-in only" },
  { value: "web_biometric", label: "Web + biometric" },
  { value: "biometric", label: "Biometric only" },
];

interface FenceForm {
  name: string;
  lat: string;
  lng: string;
  radiusMeters: string;
}

function emptyFence(): FenceForm {
  return { name: "", lat: "", lng: "", radiusMeters: "200" };
}

function SettingsAttendancePage() {
  return (
    <PermissionGuard
      permission="attendance.configure"
      fallback={<Alert variant="error">You don't have access to attendance settings.</Alert>}
    >
      <SettingsAttendanceInner />
    </PermissionGuard>
  );
}

function SettingsAttendanceInner() {
  const [settings, setSettings] = useState<AttendanceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ipText, setIpText] = useState("");
  const [fenceForm, setFenceForm] = useState<FenceForm>(emptyFence());

  const load = async () => {
    setLoading(true);
    const res = await attendanceApi.getSettings();
    if (res.data) {
      setSettings(res.data);
      setIpText(res.data.allowedIps.join("\n"));
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const patch = async (partial: Partial<AttendanceSettings>, message?: string) => {
    if (!settings) return;
    setSaving(true);
    const res = await attendanceApi.saveSettings(partial);
    setSaving(false);
    if (res.error) {
      showToast(res.error.message, "error");
      return;
    }
    setSettings(res.data ?? null);
    if (message) showToast(message, "success");
  };

  const saveIps = async () => {
    const list = ipText
      .split("\n")
      .map((v) => v.trim())
      .filter(Boolean);
    await patch({ allowedIps: list }, "IP allowlist updated");
  };

  const addFence = async () => {
    if (!fenceForm.name.trim() || !fenceForm.lat || !fenceForm.lng) {
      showToast("Name, latitude and longitude are required", "error");
      return;
    }
    const res = await attendanceApi.upsertGeoFence({
      name: fenceForm.name.trim(),
      lat: Number(fenceForm.lat),
      lng: Number(fenceForm.lng),
      radiusMeters: Number(fenceForm.radiusMeters) || 200,
    });
    if (res.error) {
      showToast(res.error.message, "error");
      return;
    }
    setSettings(res.data ?? null);
    setFenceForm(emptyFence());
    showToast("Geo-fence added", "success");
  };

  const removeFence = async (fence: GeoFence) => {
    const res = await attendanceApi.deleteGeoFence(fence.id);
    if (res.error) {
      showToast(res.error.message, "error");
      return;
    }
    setSettings(res.data ?? null);
    showToast("Geo-fence removed", "success");
  };

  if (loading || !settings) {
    return <div className="flex justify-center py-20"><Spinner size={28} /></div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-[20px] font-semibold">Attendance settings</h2>
        <p className="text-[13px] text-[#6B6B6B] mt-1">Configure how employees clock in, and the rules used to derive daily status.</p>
      </div>

      <Card className="p-5 space-y-4">
        <h3 className="text-[15px] font-semibold">Clock-in method</h3>
        <Select
          label="Capture mode"
          options={CAPTURE_MODE_OPTIONS}
          value={settings.captureMode}
          onChange={(e) => void patch({ captureMode: e.target.value as AttendanceSettings["captureMode"] }, "Capture mode updated")}
        />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[14px] font-medium text-[#0A0A0A]">Break tracking</p>
            <p className="text-[13px] text-[#6B6B6B]">Allow employees to log breaks during their shift.</p>
          </div>
          <Toggle checked={settings.breakTrackingEnabled} onChange={(v) => void patch({ breakTrackingEnabled: v }, "Updated")} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[14px] font-medium text-[#0A0A0A]">Allow regularization</p>
            <p className="text-[13px] text-[#6B6B6B]">Employees can request corrections to missed or wrong punches.</p>
          </div>
          <Toggle checked={settings.allowRegularization} onChange={(v) => void patch({ allowRegularization: v }, "Updated")} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Regularization window (days)"
            type="number"
            value={settings.regularizationWindowDays}
            onChange={(e) => void patch({ regularizationWindowDays: Number(e.target.value) || 0 })}
          />
          <Input
            label="Max regularizations / month"
            type="number"
            value={settings.maxRegularizationsPerMonth}
            onChange={(e) => void patch({ maxRegularizationsPerMonth: Number(e.target.value) || 0 })}
          />
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="text-[15px] font-semibold">Timing rules</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Late grace period (minutes)"
            type="number"
            value={settings.lateGraceMinutes}
            onChange={(e) => void patch({ lateGraceMinutes: Number(e.target.value) || 0 })}
          />
          <TimePicker
            label="Auto clock-out time"
            value={settings.autoClockOutTime}
            onChange={(v) => void patch({ autoClockOutTime: v })}
          />
          <Input
            label="Half-day threshold (minutes worked)"
            type="number"
            value={settings.halfDayMinutes}
            onChange={(e) => void patch({ halfDayMinutes: Number(e.target.value) || 0 })}
          />
          <Input
            label="Full-day threshold (minutes worked)"
            type="number"
            value={settings.fullDayMinutes}
            onChange={(e) => void patch({ fullDayMinutes: Number(e.target.value) || 0 })}
          />
          <Input
            label="Overtime after (minutes)"
            type="number"
            value={settings.overtimeAfterMinutes}
            onChange={(e) => void patch({ overtimeAfterMinutes: Number(e.target.value) || 0 })}
          />
        </div>
        <Button size="sm" loading={saving} onClick={() => showToast("Timing rules saved", "success")}>
          Save timing rules
        </Button>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-semibold">Geo-fencing</h3>
            <p className="text-[13px] text-[#6B6B6B]">Restrict web clock-in to within a radius of approved locations.</p>
          </div>
          <Toggle checked={settings.enforceGeo} onChange={(v) => void patch({ enforceGeo: v }, "Updated")} />
        </div>
        {settings.geoFences.length === 0 ? (
          <EmptyState title="No geo-fences configured." subtitle="Add a location below to start restricting clock-in by geography." />
        ) : (
          <div className="space-y-2">
            {settings.geoFences.map((f) => (
              <div key={f.id} className="flex items-center justify-between border border-[#E5E5E3] rounded-sm px-3 py-2">
                <div>
                  <p className="text-[14px] font-medium text-[#0A0A0A]">{f.name}</p>
                  <p className="text-[12px] text-[#6B6B6B]">
                    {f.lat.toFixed(4)}, {f.lng.toFixed(4)} · {f.radiusMeters}m radius
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => void removeFence(f)}>
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-4 gap-3 items-end">
          <Input label="Name" value={fenceForm.name} onChange={(e) => setFenceForm({ ...fenceForm, name: e.target.value })} />
          <Input label="Latitude" type="number" value={fenceForm.lat} onChange={(e) => setFenceForm({ ...fenceForm, lat: e.target.value })} />
          <Input label="Longitude" type="number" value={fenceForm.lng} onChange={(e) => setFenceForm({ ...fenceForm, lng: e.target.value })} />
          <Input
            label="Radius (m)"
            type="number"
            value={fenceForm.radiusMeters}
            onChange={(e) => setFenceForm({ ...fenceForm, radiusMeters: e.target.value })}
          />
        </div>
        <Button size="sm" variant="secondary" onClick={addFence}>
          + Add geo-fence
        </Button>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-semibold">IP allowlist</h3>
            <p className="text-[13px] text-[#6B6B6B]">Restrict web clock-in to approved office networks (CIDR or IP, one per line).</p>
          </div>
          <Toggle checked={settings.enforceIp} onChange={(v) => void patch({ enforceIp: v }, "Updated")} />
        </div>
        <Textarea rows={4} value={ipText} onChange={(e) => setIpText(e.target.value)} placeholder="192.168.0.0/16" />
        <div className="flex items-center justify-between">
          {settings.allowedIps.length === 0 ? (
            <Badge variant="warning">No IPs configured</Badge>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {settings.allowedIps.map((ip) => (
                <Badge key={ip} variant="default">{ip}</Badge>
              ))}
            </div>
          )}
          <Button size="sm" loading={saving} onClick={saveIps}>
            Save allowlist
          </Button>
        </div>
      </Card>
    </div>
  );
}
