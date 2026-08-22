import { Link } from "@tanstack/react-router";

export function ReportTile({ slug, title, description }: { slug: string; title: string; description: string }) {
  return (
    <Link
      to="/reports/$reportSlug"
      params={{ reportSlug: slug }}
      className="block rounded-md border border-[#E5E5E3] bg-white p-5 hover:border-[var(--tenant-primary)] transition-colors"
    >
      <h3 className="text-[15px] font-semibold text-[#0A0A0A]">{title}</h3>
      <p className="mt-1 text-[13px] text-[#6B6B6B]">{description}</p>
    </Link>
  );
}
