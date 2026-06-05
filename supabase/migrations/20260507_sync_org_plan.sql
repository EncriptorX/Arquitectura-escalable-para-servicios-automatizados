-- =====================================================
-- Sincronizar organizations.plan cuando cambia la suscripción
-- Paso 3.8 del flujo de facturación
-- =====================================================

CREATE OR REPLACE FUNCTION sync_organization_plan()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_slug TEXT;
BEGIN
  -- Solo actuar cuando la suscripción se activa o cancela
  IF NEW.status = 'active' THEN
    -- Obtener el slug del plan
    SELECT slug INTO v_plan_slug
    FROM plans WHERE id = NEW.plan_id;

    -- Actualizar el plan en la organización
    UPDATE organizations
    SET plan       = v_plan_slug,
        updated_at = NOW()
    WHERE id = NEW.organization_id;

  ELSIF NEW.status IN ('canceled', 'unpaid', 'past_due') AND OLD.status = 'active' THEN
    -- Degradar a free si se cancela
    UPDATE organizations
    SET plan       = 'free',
        updated_at = NOW()
    WHERE id = NEW.organization_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_org_plan ON subscriptions;
CREATE TRIGGER trg_sync_org_plan
  AFTER INSERT OR UPDATE OF status, plan_id ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_organization_plan();

COMMENT ON FUNCTION sync_organization_plan IS
  'Flujo 3 - Paso 3.8: Sincroniza organizations.plan cuando cambia el estado de la suscripción.';
