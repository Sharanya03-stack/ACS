-- 0003_atomic_sale.sql
-- Function to atomically create a new vehicle sale (Customer, Vehicle, Charger, Installation)
-- Runs with the caller's privileges (SECURITY INVOKER) to enforce RLS

CREATE OR REPLACE FUNCTION public.create_vehicle_sale(
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_customer_email TEXT,
    p_customer_address TEXT,
    p_customer_city TEXT,
    p_customer_state TEXT,
    p_customer_pincode TEXT,
    p_vehicle_model TEXT,
    p_vehicle_reg TEXT,
    p_charger_model TEXT,
    p_charger_power TEXT
)
RETURNS UUID AS $$
DECLARE
    v_dealer_id UUID;
    v_oem_id UUID;
    v_customer_id UUID;
    v_vehicle_id UUID;
    v_charger_id UUID;
    v_installation_id UUID;
BEGIN
    -- 1. Get authenticated dealer ID
    v_dealer_id := public.get_auth_org_id();
    IF v_dealer_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Dealer ID not found for authenticated user';
    END IF;

    -- 2. Get OEM ID (parent organization of the dealer)
    SELECT parent_org_id INTO v_oem_id FROM public.organizations WHERE id = v_dealer_id;
    IF v_oem_id IS NULL THEN
        RAISE EXCEPTION 'Integrity Error: Dealer does not belong to an OEM';
    END IF;

    -- 3. Create Customer
    INSERT INTO public.customers (
        name, phone, email, address, city, state, pincode, dealer_id
    ) VALUES (
        p_customer_name, p_customer_phone, p_customer_email, p_customer_address, p_customer_city, p_customer_state, p_customer_pincode, v_dealer_id
    ) RETURNING id INTO v_customer_id;

    -- 4. Create Vehicle
    INSERT INTO public.vehicles (
        vin, customer_id, dealer_id, oem_id, model, sale_date, delivery_date
    ) VALUES (
        -- For the prototype, we use the registration number as VIN, or generate a random one if empty
        COALESCE(NULLIF(p_vehicle_reg, ''), 'VIN' || substr(md5(random()::text), 1, 10)),
        v_customer_id, v_dealer_id, v_oem_id, p_vehicle_model, CURRENT_DATE, CURRENT_DATE + INTERVAL '2 days'
    ) RETURNING id INTO v_vehicle_id;

    -- 5. Create Charger
    INSERT INTO public.chargers (
        serial_number, vehicle_id, customer_id, model, power_rating, supplied_date
    ) VALUES (
        'CHG' || substr(md5(random()::text), 1, 10),
        v_vehicle_id, v_customer_id, p_charger_model, p_charger_power, CURRENT_DATE
    ) RETURNING id INTO v_charger_id;

    -- 6. Create Installation
    INSERT INTO public.installations (
        status, customer_id, vehicle_id, charger_id, dealer_id, oem_id
    ) VALUES (
        'NEW', v_customer_id, v_vehicle_id, v_charger_id, v_dealer_id, v_oem_id
    ) RETURNING id INTO v_installation_id;

    -- Return the installation ID
    RETURN v_installation_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
