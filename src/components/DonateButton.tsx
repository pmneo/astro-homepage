"use client";

import { site } from "@/content/site";

/** PayPal's own embeddable donate form — just needs a business PayPal email/Merchant ID, no
 *  server-side integration or API keys required. Configure via NEXT_PUBLIC_PAYPAL_BUSINESS
 *  (see .env.example). Renders nothing in production if unconfigured, since a donate button that
 *  goes nowhere is worse than no button at all. */
export default function DonateButton() {
  if (!site.paypal.business) {
    if (process.env.NODE_ENV === "development") {
      return (
        <p className="rounded-lg border border-dashed border-amber-400/40 px-4 py-3 text-sm text-amber-300">
          Set NEXT_PUBLIC_PAYPAL_BUSINESS in .env.local to show the donate button here.
        </p>
      );
    }
    return null;
  }

  return (
    <form action="https://www.paypal.com/donate" method="post" target="_blank" rel="noreferrer">
      <input type="hidden" name="business" value={site.paypal.business} />
      <input type="hidden" name="item_name" value={site.paypal.itemName} />
      <input type="hidden" name="currency_code" value="EUR" />
      <button
        type="submit"
        className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#ffc439] px-6 py-3 font-semibold text-slate-900 transition hover:bg-[#ffb800]"
        // Fires alongside the actual submit — target="_blank" means this tab never navigates
        // away, so there's no risk of the beacon getting cut off mid-flight.
        onClick={() => {
          fetch("/api/stats/donate-click", { method: "POST" }).catch(() => {});
        }}
      >
        {site.paypal.buttonLabel}
      </button>
    </form>
  );
}
