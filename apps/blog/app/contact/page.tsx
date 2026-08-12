import type { Metadata } from "next";
import Image from "next/image";
import { ContactForm } from "./contact-form";
import { DESK_EMAIL } from "../components/insider-panel";

export const metadata: Metadata = {
  title: "Get in touch",
  description: "Contact the Sporting Beat desk about coverage, corrections or partnerships.",
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-14 text-center sm:px-6">
      <p className="label text-vermillion">Contact</p>
      <h1 className="headline mt-4 text-4xl sm:text-5xl">Get in touch</h1>
      <p className="mx-auto mt-5 max-w-lg text-[1.0625rem] leading-relaxed text-muted">
        Corrections come first — if a fixture detail is wrong, tell us and we will
        fix the record. Coverage requests and partnership notes are welcome too.
      </p>

      <div className="relative mt-10 aspect-[16/7] overflow-hidden">
        <Image
          src="/placeholder-cover.svg"
          alt="Sporting Beat editorial desk"
          fill
          sizes="(max-width: 768px) 100vw, 672px"
          className="plate object-cover"
        />
      </div>

      <div className="mt-12 border border-rule bg-card p-6 sm:p-9">
        <ContactForm />
      </div>

      <div className="mt-10 border-t border-rule pt-6">
        <p className="label-sm text-muted">Or write directly</p>
        <a
          href={`mailto:${DESK_EMAIL}`}
          className="mt-2 inline-block font-display text-lg text-vermillion hover:underline"
        >
          {DESK_EMAIL}
        </a>
        <p className="label-sm mt-3 text-muted">
          Corrections are prioritised · Typically answered within two days
        </p>
      </div>
    </main>
  );
}
