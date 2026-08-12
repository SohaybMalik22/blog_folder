import Link from "next/link";
import type { DailyPoint, RankedRow, SplitRow } from "@/lib/analytics";

/**
 * Chart primitives for the analytics page. Plain HTML/CSS — no charting library,
 * so there is nothing to keep in sync with the bundle and nothing to load.
 *
 * Palette (validated with the dataviz validator against this surface, #ffffff):
 * lightness band PASS, chroma floor PASS, adjacent CVD ΔE 9.2 deutan, normal
 * vision 27.6. `SPLIT_2` (aqua) sits at 2.82:1 — below the 3:1 mark floor — so
 * every split segment carries a visible direct label as the required relief.
 * Re-run the validator before changing any of these three values.
 */
const SERIES = "#2a78d6"; // sequential / single-series magnitude
const SPLIT = ["#2a78d6", "#eb6834", "#1baf7a"] as const; // categorical slots 1-3

/** Marks wear the series colors; all text wears ink tokens, never a data hue. */
const MAX_BAR_PX = 24;

function compact(value: number): string {
  if (value < 1000) return String(value);
  if (value < 1_000_000) return `${(value / 1000).toFixed(value < 10_000 ? 1 : 0)}K`;
  return `${(value / 1_000_000).toFixed(1)}M`;
}

/* ---------------------------------------------------------------- stat tile */

export function StatTile({
  label,
  value,
  previous,
  note,
  suffix,
}: {
  label: string;
  value: number;
  /** Same-length preceding window. Omit where a delta is meaningless. */
  previous?: number;
  note?: string;
  suffix?: string;
}) {
  // A delta from a zero base is "new", not "+∞%".
  const delta =
    previous === undefined
      ? null
      : previous === 0
        ? value > 0
          ? { text: "new", tone: "text-ok" }
          : null
        : (() => {
            const pct = Math.round(((value - previous) / previous) * 100);
            if (pct === 0) return { text: "no change", tone: "text-ink-soft" };
            // More traffic is good, so direction and sentiment agree here.
            return {
              text: `${pct > 0 ? "+" : ""}${pct}%`,
              tone: pct > 0 ? "text-ok" : "text-bad",
            };
          })();

  return (
    <div className="card p-4">
      <p className="eyebrow">{label}</p>
      <p className="mt-2 text-3xl font-bold text-ink">
        {compact(value)}
        {suffix && <span className="text-base font-semibold text-ink-faint">{suffix}</span>}
      </p>
      {delta && (
        <p className={`mt-1 text-[0.75rem] font-semibold ${delta.tone}`}>
          {delta.text} <span className="font-medium text-ink-faint">vs previous period</span>
        </p>
      )}
      {note && !delta && <p className="mt-1 text-[0.6875rem] text-ink-soft">{note}</p>}
    </div>
  );
}

/* ------------------------------------------------------------ daily columns */

/** Round the axis top to a clean number so ticks read 0 / 10 / 20. */
function axisTop(max: number): number {
  if (max <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  return Math.ceil(max / (magnitude / 2)) * (magnitude / 2);
}

/**
 * Views per day. One series, so one hue and no legend — the heading names what
 * is plotted. Every day in the window is present including zeros, otherwise the
 * axis compresses and a quiet week looks busy.
 */
export function DailyColumns({ points }: { points: DailyPoint[] }) {
  const max = Math.max(...points.map((p) => p.views), 0);
  const top = axisTop(max);
  const busiest = points.reduce((a, b) => (b.views > a.views ? b : a), points[0]);

  return (
    <figure className="m-0">
      <div className="flex gap-3">
        {/* Y axis: carries the values that aren't directly labelled. */}
        <div className="flex w-8 shrink-0 flex-col justify-between py-px text-right">
          {[top, Math.round(top / 2), 0].map((tick) => (
            <span key={tick} className="text-[0.625rem] tabular-nums text-ink-faint">
              {compact(tick)}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          {/* Plot area. Gridlines are hairline, solid, one step off surface. */}
          <div className="relative h-40">
            {[0, 50].map((pct) => (
              <div
                key={pct}
                aria-hidden
                className="absolute inset-x-0 border-t border-line"
                style={{ top: `${pct}%` }}
              />
            ))}

            {/* 2px surface gaps between adjacent columns come from the gap
                utility, not from a stroke around each mark. */}
            <ol className="absolute inset-0 flex items-end gap-[2px]">
              {points.map((point) => {
                const height = top === 0 ? 0 : (point.views / top) * 100;
                const isPeak = point.views > 0 && point.views === max;
                return (
                  <li
                    key={point.date}
                    className="group relative flex h-full flex-1 items-end justify-center"
                    style={{ maxWidth: `${MAX_BAR_PX}px` }}
                  >
                    <div
                      className="w-full rounded-t"
                      style={{
                        height: `${height}%`,
                        // A zero day still shows a 2px stub so the reader can
                        // see the day exists and was empty.
                        minHeight: point.views === 0 ? "2px" : undefined,
                        background: point.views === 0 ? "var(--color-line)" : SERIES,
                      }}
                    />
                    {/* Direct label on the peak only — a number on every column
                        is noise and goes unread. */}
                    {isPeak && (
                      <span className="absolute -top-4 text-[0.625rem] font-semibold tabular-nums text-ink-soft">
                        {compact(point.views)}
                      </span>
                    )}
                    {/* CSS-only tooltip: no client JS needed on a server page. */}
                    <div
                      role="tooltip"
                      className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-5 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-surface px-2 py-1.5 text-left shadow-lg group-hover:block"
                    >
                      <p className="text-[0.6875rem] font-semibold text-ink">
                        {formatDay(point.date)}
                      </p>
                      <p className="text-[0.6875rem] text-ink-soft">
                        {point.views} views · {point.visitors} visitors
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* X axis: first and last only. A tick per day collides at 90 days. */}
          <div className="mt-1.5 flex justify-between border-t border-line pt-1.5">
            <span className="text-[0.625rem] text-ink-faint">
              {formatDay(points[0]?.date)}
            </span>
            <span className="text-[0.625rem] text-ink-faint">
              {formatDay(points[points.length - 1]?.date)}
            </span>
          </div>
        </div>
      </div>

      {busiest && busiest.views > 0 && (
        <figcaption className="mt-3 text-[0.75rem] text-ink-soft">
          Busiest day: {formatDay(busiest.date)} — {busiest.views} views
        </figcaption>
      )}

      {/* Table view, so no value is available only on hover. */}
      <details className="mt-3">
        <summary className="cursor-pointer text-[0.75rem] font-semibold text-brand">
          View as table
        </summary>
        <div className="mt-2 max-h-56 overflow-y-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Day</th>
                <th className="text-right">Views</th>
                <th className="text-right">Visitors</th>
              </tr>
            </thead>
            <tbody>
              {[...points].reverse().map((point) => (
                <tr key={point.date}>
                  <td className="whitespace-nowrap text-ink-soft">{formatDay(point.date)}</td>
                  <td className="text-right tabular-nums">{point.views}</td>
                  <td className="text-right tabular-nums text-ink-soft">{point.visitors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

function formatDay(iso: string | undefined): string {
  if (!iso) return "";
  const [, month, day] = iso.split("-");
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${MONTHS[Number(month) - 1]} ${Number(day)}`;
}

/* --------------------------------------------------------------- ranked list */

/**
 * Ordered magnitude with long labels — a list with bars, not a bar chart, since
 * the names need the horizontal room. Every bar takes the same hue: colouring
 * them darker-where-bigger would re-encode what the bar length already says.
 */
export function RankedList({
  rows,
  emptyLabel,
  unitLabel = "views",
}: {
  rows: RankedRow[];
  emptyLabel: string;
  unitLabel?: string;
}) {
  if (rows.length === 0) {
    return <p className="px-4 py-10 text-center text-ink-soft">{emptyLabel}</p>;
  }

  const max = rows[0]?.views ?? 1;

  return (
    <ol className="divide-y divide-line-soft">
      {rows.map((row, index) => (
        <li key={row.key} className="px-4 py-3">
          <div className="flex items-baseline gap-3">
            <span className="w-4 shrink-0 text-[0.75rem] font-semibold text-ink-faint">
              {index + 1}
            </span>
            {row.postId ? (
              <Link
                href={`/posts/${row.postId}`}
                className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium text-ink hover:text-brand"
              >
                {row.label}
              </Link>
            ) : (
              <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium text-ink">
                {row.label}
              </span>
            )}
            <span className="shrink-0 whitespace-nowrap text-[0.75rem] tabular-nums text-ink-soft">
              {row.views} {unitLabel}
              <span className="text-ink-faint"> · {row.visitors} visitors</span>
            </span>
          </div>
          <div className="mt-2 ml-7 h-1 rounded-full bg-line-soft">
            <div
              className="h-1 rounded-full"
              style={{ width: `${(row.views / max) * 100}%`, background: SERIES }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ---------------------------------------------------------------- split bar */

/**
 * Part-to-whole across a handful of categories: one stacked horizontal bar plus
 * a legend. Categorical hues in fixed slot order, so a category keeps its colour
 * when another one drops out. Segments are separated by a 2px surface gap.
 *
 * Every row is directly labelled with its count and share — required relief for
 * the aqua slot, which sits below 3:1 against this surface.
 */
export function SplitBar({ rows, emptyLabel }: { rows: SplitRow[]; emptyLabel: string }) {
  const total = rows.reduce((sum, row) => sum + row.views, 0);

  if (total === 0) {
    return <p className="px-4 py-10 text-center text-ink-soft">{emptyLabel}</p>;
  }

  // Past the slot count the tail folds into one row rather than inventing hues.
  const head = rows.slice(0, SPLIT.length);
  const tail = rows.slice(SPLIT.length);
  const segments = tail.length
    ? [...head, { key: "__other__", label: "Other", views: tail.reduce((s, r) => s + r.views, 0) }]
    : head;

  const colorFor = (index: number) => SPLIT[index] ?? "var(--color-ink-faint)";

  return (
    <div className="px-4 py-4">
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full">
        {segments.map((segment, index) => (
          <div
            key={segment.key}
            style={{
              width: `${(segment.views / total) * 100}%`,
              background: colorFor(index),
            }}
          />
        ))}
      </div>

      <ul className="mt-4 space-y-2">
        {segments.map((segment, index) => (
          <li key={segment.key} className="flex items-center gap-2.5">
            {/* Identity comes from the swatch beside the text, never from
                colouring the text itself. */}
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: colorFor(index) }}
            />
            <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-ink">
              {segment.label}
            </span>
            <span className="shrink-0 text-[0.75rem] tabular-nums text-ink-soft">
              {segment.views}
              <span className="text-ink-faint">
                {" "}
                · {Math.round((segment.views / total) * 100)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
