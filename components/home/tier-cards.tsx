"use client";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, RotateCw, Zap } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export interface TierView {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  priority: number;
  color: string;
  benefits: string[];
  href: string;
}

function TierCard({ tier }: { tier: TierView }) {
  const [flipped, setFlipped] = useState(false);
  const reduce = useReducedMotion();
  const toggle = () => setFlipped((f) => !f);
  const price = new Intl.NumberFormat("en-US", { style: "currency", currency: tier.currency, maximumFractionDigits: 0 }).format(tier.price);

  return (
    <div className="perspective h-[440px]">
      <motion.div
        className="preserve-3d relative h-full w-full"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={reduce ? { duration: 0 } : { duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Front */}
        <div
          role="button"
          tabIndex={flipped ? -1 : 0}
          aria-hidden={flipped}
          aria-label={`${tier.name} tier, ${price} per ${tier.interval}, plus ${tier.priority} queue priority. Show benefits`}
          onClick={toggle}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggle();
            }
          }}
          className="backface-hidden chamfer chamfer-lg absolute inset-0 flex cursor-pointer flex-col justify-between overflow-hidden border border-line bg-ink-700 p-7 text-left"
        >
          <div aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: tier.color, boxShadow: `0 0 18px ${tier.color}` }} />
          <div aria-hidden className="absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-20 blur-3xl" style={{ background: tier.color }} />
          <div className="relative">
            <p className="font-digits text-xs font-bold uppercase tracking-[0.3em] text-white/50">Supporter</p>
            <h3 className="mt-3 text-5xl" style={{ color: tier.color }}>
              {tier.name}
            </h3>
          </div>
          <div className="relative">
            <p className="font-display text-6xl font-bold text-white">
              {price}
              <span className="text-xl text-white/45">/{tier.interval}</span>
            </p>
            <span
              className="chamfer chamfer-sm mt-5 inline-flex items-center gap-2 px-3 py-1.5 font-digits text-xs font-bold uppercase tracking-[0.18em]"
              style={{ background: `${tier.color}1f`, color: tier.color }}
            >
              <Zap size={14} aria-hidden /> +{tier.priority} queue priority
            </span>
            <p className="mt-6 flex items-center gap-2 font-digits text-xs uppercase tracking-[0.2em] text-white/40">
              <RotateCw size={13} aria-hidden /> Flip for benefits
            </p>
          </div>
        </div>

        {/* Back */}
        <div
          aria-hidden={!flipped}
          className="backface-hidden rotate-y-180 chamfer chamfer-lg absolute inset-0 flex flex-col border bg-ink-600 p-7"
          style={{ borderColor: `${tier.color}55` }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-3xl" style={{ color: tier.color }}>
              {tier.name}
            </h3>
            <button
              type="button"
              tabIndex={flipped ? 0 : -1}
              onClick={toggle}
              className="p-2 text-white/50 hover:text-white"
              aria-label={`Flip ${tier.name} card back`}
            >
              <RotateCw size={16} />
            </button>
          </div>
          <ul className="mt-5 flex-1 space-y-3 overflow-y-auto text-sm text-white/75">
            {tier.benefits.map((b) => (
              <li key={b} className="flex gap-3">
                <Check size={16} className="mt-0.5 shrink-0" style={{ color: tier.color }} aria-hidden />
                {b}
              </li>
            ))}
          </ul>
          <ButtonLink href={tier.href} className="mt-6 w-full" tabIndex={flipped ? 0 : -1}>
            Get {tier.name}
          </ButtonLink>
        </div>
      </motion.div>
    </div>
  );
}

export function TierCards({ tiers }: { tiers: TierView[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {tiers.map((t) => (
        <TierCard key={t.id} tier={t} />
      ))}
    </div>
  );
}
