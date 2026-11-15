import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardHeader } from "@/components/ui/primitives";
import { money } from "@/lib/format";

const axisStyle = { fontSize: 11, fill: "var(--muted)" } as const;
const gridColor = "color-mix(in srgb, var(--line) 80%, transparent)";
const palette = ["var(--brand)", "var(--info)", "var(--warn)", "var(--accent)", "var(--muted)"];

function ChartFrame({
  title,
  description,
  legend,
  height = 240,
  children,
}: {
  title: string;
  description?: string;
  legend?: ReactNode;
  height?: number;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader title={title} description={description} action={legend} />
      <div className="px-2 py-4" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children as never}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

const tooltipStyle = {
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: 10,
  fontSize: 12,
  color: "var(--ink)",
} as const;

export function MoneyTrendChart({
  title,
  description,
  data,
  series,
}: {
  title: string;
  description?: string;
  data: Record<string, string | number>[];
  series: { key: string; label: string; color?: string }[];
}) {
  return (
    <ChartFrame title={title} description={description} height={260}>
      <AreaChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
        <defs>
          {series.map((entry, index) => (
            <linearGradient key={entry.key} id={`grad-${entry.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={entry.color ?? palette[index % palette.length]} stopOpacity={0.32} />
              <stop offset="100%" stopColor={entry.color ?? palette[index % palette.length]} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
        <XAxis dataKey="month" tick={axisStyle} tickLine={false} axisLine={false} />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={(value: number) => money(value, { compact: true })} width={58} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value: number, name: string) => [money(Number(value)), name]}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {series.map((entry, index) => (
          <Area
            key={entry.key}
            type="monotone"
            dataKey={entry.key}
            name={entry.label}
            stroke={entry.color ?? palette[index % palette.length]}
            fill={`url(#grad-${entry.key})`}
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    </ChartFrame>
  );
}

export function CategoryBarChart({
  title,
  description,
  data,
  categoryKey,
  valueKey,
  valueLabel = "Value",
  height = 260,
}: {
  title: string;
  description?: string;
  data: Record<string, string | number>[];
  categoryKey: string;
  valueKey: string;
  valueLabel?: string;
  height?: number;
}) {
  return (
    <ChartFrame title={title} description={description} height={height}>
      <BarChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
        <XAxis dataKey={categoryKey} tick={axisStyle} tickLine={false} axisLine={false} />
        <YAxis
          tick={axisStyle}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: number) =>
            valueLabel === "Value" ? money(Number(value), { compact: true }) : String(value)
          }
          width={58}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value: number) => [valueLabel === "Value" ? money(Number(value)) : Number(value), valueLabel]}
        />
        <Bar dataKey={valueKey} fill="var(--brand)" radius={[6, 6, 0, 0]} maxBarSize={46} />
      </BarChart>
    </ChartFrame>
  );
}

export function DonutChart({
  title,
  description,
  data,
  nameKey,
  valueKey,
  height = 260,
  valueFormatter,
}: {
  title: string;
  description?: string;
  data: Record<string, string | number>[];
  nameKey: string;
  valueKey: string;
  height?: number;
  valueFormatter?: (value: number) => string;
}) {
  return (
    <ChartFrame title={title} description={description} height={height}>
      <PieChart>
        <Pie data={data} dataKey={valueKey} nameKey={nameKey} innerRadius="58%" outerRadius="82%" paddingAngle={2}>
          {data.map((_entry, index) => (
            <Cell key={index} fill={palette[index % palette.length]} stroke="var(--surface)" />
          ))}
        </Pie>
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value: number, name: string) => [
            valueFormatter ? valueFormatter(Number(value)) : money(Number(value)),
            name,
          ]}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ChartFrame>
  );
}
