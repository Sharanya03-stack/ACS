-- Add RLS for OEM to Insert/Update Vehicles
CREATE POLICY "Vehicles OEM Insert" ON public.vehicles FOR INSERT WITH CHECK ( 
  public.get_auth_role() = 'OEM' AND
  oem_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Vehicles OEM Update" ON public.vehicles FOR UPDATE USING ( 
  public.get_auth_role() = 'OEM' AND
  oem_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
) WITH CHECK ( 
  public.get_auth_role() = 'OEM' AND
  oem_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);
