import Link from "next/link";
import { ArrowUpRight, Building2, Box, Mountain, Plane, Scan, ScanLine } from "lucide-react";
import type { Service } from "@/lib/data";

const icons = {
  "Топография": Mountain,
  "БПЛА": Plane,
  "LiDAR": Scan,
  "Строительство": Building2,
  "3D / BIM": Box,
  "Аналитика": ScanLine,
} as const;

export function ServiceCard({ service }: { service: Service }) {
  const Icon = icons[service.category as keyof typeof icons] ?? ScanLine;

  return (
    <Link className="service-card" href={`/services/${service.slug}`}>
      <div className="service-icon-row">
        <span className="eyebrow">{service.category}</span>
        <span className="service-icon"><Icon size={17} /></span>
      </div>
      <h3>{service.name}</h3>
      <p>{service.short}</p>
      <div className="service-bottom">
        <span>{service.deliverable}</span>
        <ArrowUpRight size={18} />
      </div>
    </Link>
  );
}
