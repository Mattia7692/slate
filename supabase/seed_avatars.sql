-- =============================================================
-- Seed avatar e portfolio per profili demo
-- NON tocca il profilo del founder (c9334219-09cf-43c6-b191-653d76ad5a4e)
-- Da eseguire nel SQL editor di Supabase
-- =============================================================

DO $$
DECLARE
  -- Fotografi in azione (macchina fotografica in mano, set, studio)
  photographer_avatars TEXT[] := ARRAY[
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=400&h=400',
    'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=400&h=400',
    'https://images.unsplash.com/photo-1471341971476-ae15ff5dd4ea?auto=format&fit=crop&w=400&h=400',
    'https://images.unsplash.com/photo-1500930287596-c1ecaa373bb2?auto=format&fit=crop&w=400&h=400',
    'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?auto=format&fit=crop&w=400&h=400',
    'https://images.unsplash.com/photo-1493863641943-9b68992a8d07?auto=format&fit=crop&w=400&h=400'
  ];

  -- Modelle/modelli in posa (fashion, editoriale)
  model_avatars TEXT[] := ARRAY[
    'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=400&h=400',
    'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=400&h=400',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&h=400',
    'https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&w=400&h=400',
    'https://images.unsplash.com/photo-1526510747491-58f928ec870f?auto=format&fit=crop&w=400&h=400',
    'https://images.unsplash.com/photo-1519058082700-08a0b56da9b4?auto=format&fit=crop&w=400&h=400'
  ];

  -- Portfolio fotografi: scatti di moda/editoriale (il loro lavoro)
  photographer_portfolio TEXT[] := ARRAY[
    'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=800&h=1000',
    'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=800&h=1000',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&h=1000',
    'https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&w=800&h=1000',
    'https://images.unsplash.com/photo-1519058082700-08a0b56da9b4?auto=format&fit=crop&w=800&h=1000',
    'https://images.unsplash.com/photo-1526510747491-58f928ec870f?auto=format&fit=crop&w=800&h=1000',
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&h=1000',
    'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=800&h=1000'
  ];

  -- Portfolio modelle: foto di posa, look diversi
  model_portfolio TEXT[] := ARRAY[
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&h=1000',
    'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=800&h=1000',
    'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&h=1000',
    'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=800&h=1000',
    'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=800&h=1000',
    'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=800&h=1000',
    'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?auto=format&fit=crop&w=800&h=1000',
    'https://images.unsplash.com/photo-1566206091558-7f218b696731?auto=format&fit=crop&w=800&h=1000'
  ];

  oldest_photos TEXT[] := ARRAY[
    'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=800&h=600',
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&h=600',
    'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?auto=format&fit=crop&w=800&h=600'
  ];

  r RECORD;
  idx INT;
  port_idx INT;
  n INT;
BEGIN

  -- ── AVATAR FOTOGRAFI ──────────────────────────────────────────
  idx := 1;
  FOR r IN (
    SELECT id FROM profiles
    WHERE role = 'photographer'
      AND id != 'c9334219-09cf-43c6-b191-653d76ad5a4e'
    ORDER BY created_at
  ) LOOP
    UPDATE profiles
    SET
      avatar_url      = photographer_avatars[((idx - 1) % array_length(photographer_avatars, 1)) + 1],
      oldest_photo_url = oldest_photos[((idx - 1) % array_length(oldest_photos, 1)) + 1]
    WHERE id = r.id;
    idx := idx + 1;
  END LOOP;

  -- ── AVATAR MODELLE ────────────────────────────────────────────
  idx := 1;
  FOR r IN (
    SELECT id FROM profiles
    WHERE role = 'model'
      AND id != 'c9334219-09cf-43c6-b191-653d76ad5a4e'
    ORDER BY created_at
  ) LOOP
    UPDATE profiles
    SET
      avatar_url       = model_avatars[((idx - 1) % array_length(model_avatars, 1)) + 1],
      oldest_photo_url = oldest_photos[((idx - 1) % array_length(oldest_photos, 1)) + 1]
    WHERE id = r.id;
    idx := idx + 1;
  END LOOP;

  -- ── PORTFOLIO FOTOGRAFI ───────────────────────────────────────
  FOR r IN (
    SELECT id, role FROM profiles
    WHERE id != 'c9334219-09cf-43c6-b191-653d76ad5a4e'
    ORDER BY created_at
  ) LOOP
    -- Rimuovi portfolio esistente
    DELETE FROM portfolio_items WHERE profile_id = r.id;

    -- Inserisci 4 nuove foto
    FOR n IN 1..4 LOOP
      IF r.role = 'photographer' THEN
        port_idx := ((n - 1 + (SELECT COUNT(*) FROM profiles p2 WHERE p2.id < r.id AND p2.role = 'photographer')::int) % array_length(photographer_portfolio, 1)) + 1;
        INSERT INTO portfolio_items (profile_id, image_url, order_index)
        VALUES (r.id, photographer_portfolio[port_idx], n - 1);
      ELSE
        port_idx := ((n - 1 + (SELECT COUNT(*) FROM profiles p2 WHERE p2.id < r.id AND p2.role = 'model')::int) % array_length(model_portfolio, 1)) + 1;
        INSERT INTO portfolio_items (profile_id, image_url, order_index)
        VALUES (r.id, model_portfolio[port_idx], n - 1);
      END IF;
    END LOOP;
  END LOOP;

END $$;
