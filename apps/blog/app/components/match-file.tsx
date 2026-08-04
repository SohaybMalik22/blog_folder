import type { RawMatch } from "@cricket-blog/types";

/**
 * The article page's anchor block. It deliberately shows the fixture record the
 * piece was generated from — the number is the fixture's position in the
 * season, not a statistic invented for effect.
 */
export function MatchFile({ match }: { match: RawMatch }) {
  const fixtureNumber = match.matchTitle.match(/match\s+(\d+)/i)?.[1];

  const rows = [
    { term: "Teams", value: match.teams.join(" v ") },
    { term: "Format", value: match.format },
    { term: "Venue", value: match.venue },
    { term: "Date", value: match.date },
  ].filter((row) => row.value);

  return (
    <aside className="my-12 border-y-2 border-ink py-8 text-center">
      <p className="label text-muted">Match file</p>

      {fixtureNumber ? (
        <p className="mt-3">
          <span className="font-display text-6xl font-bold leading-none text-vermillion">
            {fixtureNumber.padStart(2, "0")}
          </span>
          <span className="label-sm mt-2 block text-muted">Fixture of the season</span>
        </p>
      ) : (
        <p className="mt-3">
          <span className="font-display text-5xl font-bold leading-none text-vermillion">
            {match.format}
          </span>
        </p>
      )}

      <dl className="mx-auto mt-7 grid max-w-md gap-x-6 gap-y-3 text-left sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.term} className="border-t border-rule pt-2">
            <dt className="label-sm text-muted">{row.term}</dt>
            <dd className="mt-1 text-[0.9375rem]">{row.value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
