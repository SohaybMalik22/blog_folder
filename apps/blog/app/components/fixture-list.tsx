import type { Sport } from "@cricket-blog/types";
import type { Fixture } from "@/lib/posts";
import { SPORT_META } from "@/lib/site";

/**
 * The scraped schedule, straight from the event records. Head-to-head sports
 * show the pairing; field events show the event's own name, with the winner
 * once it has been run — that's the only thing a race row can say that a
 * fixture row can't.
 */
export function FixtureList({
  fixtures,
  sport,
}: {
  fixtures: Fixture[];
  sport?: Sport;
}) {
  // Mixed-sport lists have no single schedule label to use.
  const heading = sport ? SPORT_META[sport].scheduleLabel : "Schedule";

  return (
    <div>
      <h2 className="section-head">
        <span className="label">{heading}</span>
      </h2>
      <ol className="divide-y divide-rule">
        {fixtures.map((fixture, index) => (
          <li
            key={`${fixture.number ?? index}-${fixture.headline || fixture.teams.join()}`}
            className="flex gap-4 py-3 first:pt-0"
          >
            <span className="font-display text-sm font-bold text-vermillion">
              {fixture.number ? String(fixture.number).padStart(2, "0") : "—"}
            </span>
            <div className="min-w-0">
              <p className="text-[0.9375rem] leading-snug">
                {fixture.teams.length === 2
                  ? fixture.teams.join(" v ")
                  : fixture.headline}
              </p>
              <p className="label-sm mt-1 text-muted">
                {[
                  fixture.date,
                  fixture.localTime || fixture.location,
                  fixture.contested && fixture.winner ? `Won by ${fixture.winner}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
