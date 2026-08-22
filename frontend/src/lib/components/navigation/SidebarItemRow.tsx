/** Draggable row in Navigation Management. Same ≡ handle pattern as Phase 7/8. */
import type { DragEvent } from "react";
import { Badge, Button } from "@/lib/components/ui";
import { NavIcon } from "./IconPicker";
import type { SidebarItemConfig } from "@/lib/types/navigation";

export interface SidebarItemRowProps {
  item: SidebarItemConfig;
  roleNames: string[];
  formCount?: number;
  onEdit: () => void;
  onDelete?: () => void;
  onDragStart: (e: DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
}

export function SidebarItemRow({
  item, roleNames, formCount, onEdit, onDelete, onDragStart, onDragOver, onDrop,
}: SidebarItemRowProps) {
  const isCustom = item.kind === "custom_top_level";
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => { e.preventDefault(); onDragOver(e); }}
      onDrop={(e) => { e.preventDefault(); onDrop(e); }}
      className="flex items-center gap-3 rounded-md border border-[#E5E5E3] bg-white px-3 py-2.5"
    >
      <span aria-hidden className="cursor-grab select-none text-[15px] text-[#6B6B6B]">≡</span>
      <NavIcon name={item.icon} className="text-[#6B6B6B]" />
      <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{item.label}</span>
      {item.isHidden && <Badge variant="warning">Hidden</Badge>}
      <span className="hidden text-[12px] text-[#6B6B6B] md:inline">
        {isCustom && `${formCount ?? 0} form${formCount === 1 ? "" : "s"} · `}
        Visible to: {roleNames.length ? roleNames.join(", ") : "No one"}
      </span>
      <Button size="sm" variant="secondary" onClick={onEdit}>Edit</Button>
      {onDelete && <Button size="sm" variant="ghost" onClick={onDelete}>Delete</Button>}
    </div>
  );
}