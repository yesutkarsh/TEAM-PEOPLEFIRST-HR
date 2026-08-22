/** Interactive org tree. Each node is collapsible. */
import { useMemo, useState } from "react";
import type { Employee } from "@/lib/types/employee";
import type { Designation } from "@/lib/api/settings";
import { OrgNode } from "./OrgNode";

export interface OrgChartProps {
  employees: Employee[];
  designations: Designation[];
  query: string;
  zoom: number;
}

interface TreeNode {
  emp: Employee;
  children: TreeNode[];
}

function buildTree(employees: Employee[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  employees.forEach((e) => byId.set(e.id, { emp: e, children: [] }));
  const roots: TreeNode[] = [];
  employees.forEach((e) => {
    const node = byId.get(e.id)!;
    const parent = e.reportingManagerId ? byId.get(e.reportingManagerId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });
  return roots;
}

function NodeBlock({
  node,
  designations,
  highlightedId,
}: {
  node: TreeNode;
  designations: Designation[];
  highlightedId?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const desigName = designations.find((d) => d.id === node.emp.designationId)?.name;
  return (
    <li className="flex flex-col items-center">
      <OrgNode
        employee={node.emp}
        highlighted={highlightedId === node.emp.id}
        hasChildren={node.children.length > 0}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        designationName={desigName}
      />
      {!collapsed && node.children.length > 0 && (
        <>
          <span className="h-4 w-px bg-[var(--tenant-primary)]/30" aria-hidden />
          <ul className="flex items-start gap-6 pt-0 relative">
            <span className="absolute left-0 right-0 top-0 h-px bg-[var(--tenant-primary)]/30" aria-hidden />
            {node.children.map((c) => (
              <li key={c.emp.id} className="flex flex-col items-center pt-4 relative">
                <span className="absolute top-0 left-1/2 h-4 w-px -translate-x-1/2 bg-[var(--tenant-primary)]/30" aria-hidden />
                <NodeBlock node={c} designations={designations} highlightedId={highlightedId} />
              </li>
            ))}
          </ul>
        </>
      )}
    </li>
  );
}

export function OrgChart({ employees, designations, query, zoom }: OrgChartProps) {
  const tree = useMemo(() => buildTree(employees), [employees]);
  const highlightedId = useMemo(() => {
    if (!query) return undefined;
    const q = query.toLowerCase();
    return employees.find((e) => `${e.firstName} ${e.lastName}`.toLowerCase().includes(q))?.id;
  }, [query, employees]);

  return (
    <div className="overflow-auto p-8 bg-[#FAFAF8] rounded-md border border-[#E5E5E3] h-full">
      <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left", display: "inline-block" }}>
        <ul className="flex items-start gap-8">
          {tree.map((r) => (
            <NodeBlock key={r.emp.id} node={r} designations={designations} highlightedId={highlightedId} />
          ))}
        </ul>
      </div>
    </div>
  );
}