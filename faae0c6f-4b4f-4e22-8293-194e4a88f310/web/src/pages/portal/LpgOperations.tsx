import { Flame, Factory, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/primitives";
import { Inventory } from "./Inventory";

const stages = [
  {
    icon: Flame,
    title: "Bulk gas",
    body: "Terminal storage and tanker loading. Stock is committed before a lift is confirmed.",
    to: "/portal/manufacturing",
  },
  {
    icon: Factory,
    title: "Filling",
    body: "Cylinder filling batches consume bulk gas and shells, then wait for quality release.",
    to: "/portal/manufacturing",
  },
  {
    icon: Package,
    title: "Finished cylinders",
    body: "Released cylinders are held by location until an order allocates them.",
    to: "/portal/orders",
  },
];

export function LpgOperations() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {stages.map((stage) => (
          <Link key={stage.title} to={stage.to} className="block">
            <Card className="h-full p-5 transition-colors hover:border-line-strong">
              <stage.icon className="size-4 text-brand" aria-hidden />
              <p className="mt-3 text-[13px] font-semibold text-ink">{stage.title}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted">{stage.body}</p>
            </Card>
          </Link>
        ))}
      </div>
      <Inventory
        category="lpg"
        title="LPG operations"
        description="Bulk gas, cylinder shells and filled cylinders across the terminal, plant and channel locations."
      />
    </div>
  );
}
