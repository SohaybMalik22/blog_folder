import { hasResults, sportOf, type RawMatch } from "@cricket-blog/types";
import { SPORT_META } from "@/lib/site";

/** How much of a 20-car classification is worth printing inline. */
const CLASSIFICATION_ROWS = 5;

interface Innings {
  team: string;
  runs: number;
  wickets?: number;
}

/** "171/4", or plain "171" when the side was not bowled out and the source
 *  didn't record wickets. */
function scoreOf(innings: Innings): string {
  return innings.wickets === undefined ? String(innings.runs) : `${innings.runs}/${innings.wickets}`;
}

/**
 * The article page's anchor block: the event record the piece was generated
 * from, shown so the reader can check the prose against the data rather than
 * taking a restatement of it on trust. Every value here is scraped, never a
 * statistic invented for visual effect.
 */
export function EventFile({ match }: { match: RawMatch }) {
  const sport = sportOf(match.sport);
  const meta = SPORT_META[sport];
  const round = match.matchTitle.match(/(?:match|round)\s+(\d+)/i)?.[1];
  const standings = match.standings ?? [];
  const scorecard = (match.scorecard ?? {}) as Record<string, unknown>;
  const innings = (scorecard.innings as Innings[] | undefined) ?? [];
  const result = typeof scorecard.result === "string" ? scorecard.result : "";
  // Sources that carry their own licence credit (the CPL feed) override the
  // per-sport one, so a sport covered by two sources credits each correctly.
  const credit =
    typeof scorecard.attribution === "string" && typeof scorecard.referenceUrl === "string"
      ? { label: scorecard.attribution, href: scorecard.referenceUrl }
      : meta.dataCredit;

  const rows = [
    match.teams.length === 2
      ? { term: "Teams", value: match.teams.join(" v ") }
      : { term: "Circuit", value: match.venue },
    { term: "Format", value: match.format },
    match.teams.length === 2 ? { term: "Venue", value: match.venue } : null,
    { term: "Date", value: match.date },
  ].filter((row): row is { term: string; value: string } => !!row?.value);

  return (
    <aside className="my-12 border-y-2 border-ink py-8 text-center">
      <p className="label text-muted">
        {sport === "cricket" ? "Match file" : "Race file"}
      </p>

      {round ? (
        <p className="mt-3">
          <span className="font-display text-6xl font-bold leading-none text-vermillion">
            {round.padStart(2, "0")}
          </span>
          <span className="label-sm mt-2 block text-muted">
            {sport === "cricket" ? "Fixture of the season" : "Round of the season"}
          </span>
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

      {innings.length === 2 && (
        <div className="mx-auto mt-8 max-w-md text-left">
          <p className="label-sm border-b border-rule pb-2 text-muted">Scoreline</p>
          <ol className="divide-y divide-rule">
            {innings.map((entry) => (
              <li key={entry.team} className="flex items-baseline gap-3 py-2">
                <span className="min-w-0 flex-1 text-[0.9375rem] leading-snug">{entry.team}</span>
                <span className="font-display shrink-0 text-sm font-bold text-vermillion">
                  {scoreOf(entry)}
                </span>
              </li>
            ))}
          </ol>
          {result && <p className="label-sm mt-3 text-muted">{result}</p>}
        </div>
      )}

      {standings.length > 0 && (
        <div className="mx-auto mt-8 max-w-md text-left">
          <p className="label-sm border-b border-rule pb-2 text-muted">
            Classification · top {Math.min(CLASSIFICATION_ROWS, standings.length)} of{" "}
            {standings.length}
          </p>
          <ol className="divide-y divide-rule">
            {standings.slice(0, CLASSIFICATION_ROWS).map((entry) => (
              <li key={entry.position} className="flex items-baseline gap-3 py-2">
                <span className="font-display w-6 shrink-0 text-sm font-bold text-vermillion">
                  {entry.position}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.9375rem] leading-snug">{entry.name}</span>
                  <span className="label-sm text-muted">
                    {[entry.team, entry.detail].filter(Boolean).join(" · ")}
                  </span>
                </span>
                {entry.points !== undefined && (
                  <span className="label-sm shrink-0 text-muted">{entry.points} pts</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {!hasResults(match) && (
        <p className="label-sm mx-auto mt-6 max-w-md text-muted">
          This {meta.eventNoun} has not been contested yet — the piece above is a
          preview, not a report.
        </p>
      )}

      {credit && (
        <p className="label-sm mt-6 text-muted">
          <a
            href={credit.href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-rule underline-offset-2 hover:text-ink"
          >
            {credit.label}
          </a>
        </p>
      )}
    </aside>
  );
}
