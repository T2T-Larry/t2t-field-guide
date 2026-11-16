-- Nov 16 2026 (Larry): the LIBRARY SELECTOR in the card Gear.
-- library_shelf: which Library shelf a card sits on (concepts, resources, stories, gems, notebooks); null = not in the Library.
-- adds_library: the Gear's Library row is checked (shows on the back of the card). Whether the ribbon also shows on the front is the word 'library' in front_hidden (same as every other Gear row).
-- Nothing is lost by unchecking the row: the shelf stays saved. The X in the selector is what removes a card from the Library.
alter table public.ideas add column if not exists library_shelf text;
alter table public.ideas add column if not exists adds_library boolean;

-- The five Library headers on MASTER VISION, previously painted by id as a preview (controls/library-ribbons.js). Ribbons show on their front.
update public.ideas set library_shelf = 'concepts',  adds_library = true where id = '2ffd5d6b-ced6-4a56-865b-2221aaaea883' and library_shelf is null;
update public.ideas set library_shelf = 'resources', adds_library = true where id = '4380dc24-1bb1-4c97-984d-60016844bc7d' and library_shelf is null;
update public.ideas set library_shelf = 'gems',      adds_library = true where id = '1d0027d5-c353-4f2e-b2c8-cc933888d8f0' and library_shelf is null;
update public.ideas set library_shelf = 'stories',   adds_library = true where id = '5a7f6ed4-4c6e-40df-8936-ec6e9076a45e' and library_shelf is null;
update public.ideas set library_shelf = 'notebooks', adds_library = true where id = '609d386b-3c81-4b5a-b59d-49427df229ff' and library_shelf is null;
