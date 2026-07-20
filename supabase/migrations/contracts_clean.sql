Am I supposed to keep pasting this and pasting this and pasting this or am I supposed to delete what I'm pasting that's not properly going through1 FROM pg_policies WHERE tablename = 'contract_templates' AND policyname = 'Public can view contract by token') THEN
    CREATE POLICY "Public can view contract by token" ON contract_templates FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contract_signings' AND policyname = 'Public can view signing by token') THEN
    CREATE POLICY "Public can view signing by token" ON contract_signings FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contract_signings' AND policyname = 'Public can update signing to sign') THEN
    CREATE POLICY "Public can update signing to sign" ON contract_signings FOR UPDATE USING (true);
  END IF;
END $$;
