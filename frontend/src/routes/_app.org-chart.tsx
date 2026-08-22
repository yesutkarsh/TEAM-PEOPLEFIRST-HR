import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Breadcrumb } from "@/lib/components/ui";
import { OrgChart, OrgChartControls } from "@/lib/components/org-chart";
import { listEmployees } from "@/lib/api/employees";
import { settingsApi, type Designation } from "@/lib/api/settings";
import type { Employee } from "@/lib/types/employee";

export const Route = createFileRoute("/_app/org-chart")({
  component: OrgChartPage,
  head: () => ({ meta: [{ title: "Org Chart — HRMS" }] }),
});

function OrgChartPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [query, setQuery] = useState("");
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    void Promise.all([listEmployees(), settingsApi.listDesignations()]).then(([e, d]) => {
      if (e.data) setEmployees(e.data);
      if (d.data) setDesignations(d.data);
    });
  }, []);

  return (
    <div className="space-y-4 h-[calc(100vh-6rem)] flex flex-col">
      <Breadcrumb items={[{ label: "Org chart" }]} />
      <h1 className="text-[28px] font-bold tracking-[-0.02em]">Org chart</h1>
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 min-h-0">
        <aside className="rounded-md border border-[#E5E5E3] bg-white p-4">
          <OrgChartControls
            query={query}
            onQuery={setQuery}
            onZoomIn={() => setZoom((z) => Math.min(1.6, z + 0.1))}
            onZoomOut={() => setZoom((z) => Math.max(0.5, z - 0.1))}
            onFit={() => setZoom(1)}
          />
        </aside>
        <div className="min-h-0">
          <OrgChart employees={employees} designations={designations} query={query} zoom={zoom} />
        </div>
      </div>
    </div>
  );
}