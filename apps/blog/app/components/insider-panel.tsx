"use client";

import { useState, type FormEvent } from "react";

export const DESK_EMAIL = "editorial@cricketbeat.example";

/**
 * There is no mailing-list service wired up, so rather than fake a
 * "you're subscribed" state this hands the request to the reader's own mail
 * client. The copy says so before they type anything.
 */
export function InsiderPanel() {
  const [email, setEmail] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const subject = encodeURIComponent("Add me to Sporting Beat dispatches");
    const body = encodeURIComponent(`Please add ${email} to the dispatch list.`);
    window.location.href = `mailto:${DESK_EMAIL}?subject=${subject}&body=${body}`;
  }

  return (
    <div className="bg-forest p-6 text-paper">
      <h2 className="font-display text-lg font-bold uppercase leading-tight tracking-[0.1em]">
        Sporting Beat
        <span className="block text-vermillion">Insider</span>
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-paper/70">
        Every new dispatch, sent as it clears the desk.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-3">
        <label htmlFor="insider-email" className="sr-only">
          Your email address
        </label>
        <input
          id="insider-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full border border-forest-line bg-forest-deep px-3 py-2.5 text-sm text-paper placeholder:text-paper/40 focus:border-vermillion focus:outline-none"
        />
        <button type="submit" className="btn-primary w-full">
          Request dispatches
        </button>
      </form>

      <p className="label-sm mt-3 text-paper/45">Opens your mail app</p>
    </div>
  );
}
