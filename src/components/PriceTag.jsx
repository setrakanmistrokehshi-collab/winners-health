import { formatNairaAmount, formatMoney } from '@/config/cartMoney';
import useCurrencyStore from '@/context/currencyStore';

/**
 * Price display matching the approved reference screenshots: every
 * price renders with a strikethrough regardless of whether there's
 * a genuine discount. This is a deliberate styling choice the user
 * confirmed explicitly (not a bug) — a visual signal that the shown
 * price is a deal, applied uniformly rather than only on discounted
 * items.
 *
 * `size` controls font-size/weight for the primary price; the
 * strikethrough treatment itself doesn't change with size.
 *
 * Pass exactly ONE of:
 *   - `amount`: a plain Naira number. Converted to the customer's
 *     currently-SELECTED display currency (see currencyStore.js)
 *     before formatting — this is a DISPLAY-ONLY conversion; the
 *     underlying Naira value (Product.price, cart totals) never
 *     changes, only what's shown. The real charge amount is computed
 *     server-side at checkout using the same rate, independently.
 *   - `text`: an already-formatted string, shown exactly as given
 *     with no currency conversion applied. Use this for real Order
 *     documents (kobo, run through config/money.js's formatNaira
 *     first) — those are historical records of what was ACTUALLY
 *     charged in whatever currency the order itself records, and
 *     re-converting them to today's rate would misrepresent history.
 *
 * `strike` defaults to true (the reference design's convention).
 * Set `strike={false}` for grand-total rows and CTA button price
 * labels — a struck-through price inside "Pay ₦34,500 →" or next to
 * "Total" reads as voided/cancelled rather than "this is a deal",
 * which is the one deliberate exception to the otherwise-uniform
 * strikethrough treatment (matches the original reference
 * screenshot, which also left its Total row unstruck).
 *
 * `color` overrides the default forest/muted text color entirely —
 * needed when a price sits on a non-default background (e.g. white
 * text on the blue "Pay ₦X" button) where neither --forest nor
 * --muted would be legible.
 */
export default function PriceTag({ amount, text, size = 'md', muted = false, serif = false, strike = true, color }) {
  const currency = useCurrencyStore((s) => s.getCurrent());

  const sizes = {
    sm: { fontSize: 13, fontWeight: 600 },
    md: { fontSize: 16, fontWeight: 700 },
    lg: { fontSize: 22, fontWeight: 700 },
    xl: { fontSize: 30, fontWeight: 700 },
  };
  const s = sizes[size] || sizes.md;

  const display = text !== undefined
    ? text
    : currency.code === 'NGN'
      ? formatNairaAmount(amount)
      : formatMoney(amount, currency.code, currency.rate);

  return (
    <span
      style={{
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
        color: color || (muted ? 'var(--muted)' : 'var(--forest)'),
        textDecoration: strike ? 'line-through' : 'none',
        textDecorationColor: color || (muted ? 'var(--muted)' : 'var(--sage)'),
        textDecorationThickness: '1.5px',
        fontFamily: serif ? 'var(--font-display)' : 'var(--font-body)',
        whiteSpace: 'nowrap',
      }}
    >
      {display}
    </span>
  );
}
