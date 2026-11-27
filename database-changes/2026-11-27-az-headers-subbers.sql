-- A-Z feature (Nov 27 2026): each card holds two choices, ALL headers and ALL subbers; empty = follow the card above.
alter table public.card_order_prefs add column if not exists headers_on boolean;
alter table public.card_order_prefs add column if not exists subbers_on boolean;
-- The older single switch meant "the cards directly under this card": carry it over as headers on.
update public.card_order_prefs set headers_on = true where alpha_on and headers_on is null and subbers_on is null;
