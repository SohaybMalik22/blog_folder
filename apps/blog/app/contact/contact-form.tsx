"use client";

import { useState, type FormEvent } from "react";
import { DESK_EMAIL } from "../components/insider-panel";

/**
 * No mail transport is configured, so this composes the message in the reader's
 * own mail client instead of pretending to send it server-side.
 */
export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const subject = encodeURIComponent(`Sporting Beat enquiry from ${name}`);
    const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
    window.location.href = `mailto:${DESK_EMAIL}?subject=${subject}&body=${body}`;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-left">
      <div>
        <label htmlFor="name" className="label-sm text-muted">
          Name
        </label>
        <input
          id="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          className="field mt-1"
        />
      </div>

      <div>
        <label htmlFor="email" className="label-sm text-muted">
          Email address
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="field mt-1"
        />
      </div>

      <div>
        <label htmlFor="message" className="label-sm text-muted">
          Message
        </label>
        <textarea
          id="message"
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What would you like to tell the desk?"
          className="field mt-1 resize-y"
        />
      </div>

      <button type="submit" className="btn-primary">
        Open in mail app
      </button>
    </form>
  );
}
