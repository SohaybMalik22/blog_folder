import type { Fixture } from "@/lib/posts";

/** Season schedule straight from the scraped fixture record. */
export function FixtureList({ fixtures }: { fixtures: Fixture[] }) {
  return (
    <div>
      <h2 className="section-head">
        <span className="label">Season fixtures</span>
      </h2>
      <ol className="divide-y divide-rule">
        {fixtures.map((fixture, index) => (
          <li
            key={`${fixture.number ?? index}-${fixture.teams.join()}`}
            className="flex gap-4 py-3 first:pt-0"
          >
            <span className="font-display text-sm font-bold text-vermillion">
              {fixture.number ? String(fixture.number).padStart(2, "0") : "—"}
            </span>
            <div className="min-w-0">
              <p className="text-[0.9375rem] leading-snug">{fixture.teams.join(" v ")}</p>
              <p className="label-sm mt-1 text-muted">
                {[fixture.date, fixture.localTime].filter(Boolean).join(" · ")}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
