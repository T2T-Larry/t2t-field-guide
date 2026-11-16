-- Nov 16 2026 (Larry): the FEATURE BREAKERS in the card Gear.
-- features: the features switched ON for this card, a comma list of feature words (today: library). Empty or null = every breaker off.
-- Flipping a breaker on a card writes the new list to that card and every card beneath it (cluster_id tree). The code does not police who may flip it back.
-- A feature that is off hides its Gear row and its card ribbon; whatever was saved on the card (its Library shelf) stays.
alter table public.ideas add column if not exists features text;
-- Cards that already sit on a Library shelf keep the Library feature on.
update public.ideas set features = 'library' where library_shelf is not null and features is null;
