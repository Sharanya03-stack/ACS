import React from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { BatteryCharging, CheckCircle2, Clock, Truck, ShieldCheck, MapPin } from 'lucide-react';
import Image from 'next/image';

export default async function PublicTrackingPage({
  params
}: {
  params: Promise<{ token: string }>
}) {
  // Use service role key to bypass RLS for public tracking page (read-only safe query)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const { token } = await params;

  // UUID validation regex to prevent malformed requests
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(token)) {
    notFound();
  }

  // Fetch installation by tracking token without exposing PII
  const { data: inst } = await supabase
    .from('installations')
    .select(`
      id,
      status,
      category,
      created_at,
      scheduled_date,
      customers (
        city,
        state
      ),
      chargers (
        model,
        power_rating
      )
    `)
    .eq('tracking_token', token)
    .single();

  if (!inst) {
    notFound();
  }

  // Fetch audit logs for timeline
  const { data: events } = await supabase
    .from('audit_logs')
    .select('action, new_value, created_at')
    .eq('entity_type', 'INSTALLATION')
    .eq('entity_id', inst.id)
    .order('created_at', { ascending: true });

  // Map internal events to customer-facing timeline steps
  const timelineEvents: { title: string; description: string; date: string; icon: any; color: string }[] = [];
  
  // 1. Order Placed
  timelineEvents.push({
    title: 'Order Received',
    description: `We've received your request for ${inst.category?.replace(/_/g, ' ')}`,
    date: new Date(inst.created_at).toLocaleString(),
    icon: FileText,
    color: 'bg-[#243B36]'
  });

  let partnerAssigned = false;
  let inProgress = false;
  let verified = false;

  if (events) {
    for (const ev of events) {
      if (ev.action === 'PARTNER_ASSIGNED' && !partnerAssigned) {
        partnerAssigned = true;
        timelineEvents.push({
          title: 'Installation Partner Assigned',
          description: 'A certified ACS partner has been assigned to your installation.',
          date: new Date(ev.created_at).toLocaleString(),
          icon: ShieldCheck,
          color: 'bg-blue-600'
        });
      }
      if (ev.action === 'STATUS_CHANGED') {
        const status = ev.new_value?.status;
        if (status === 'IN_PROGRESS' && !inProgress) {
          inProgress = true;
          timelineEvents.push({
            title: 'Installation Started',
            description: 'The technician has begun the installation process.',
            date: new Date(ev.created_at).toLocaleString(),
            icon: Truck,
            color: 'bg-purple-600'
          });
        }
        if (status === 'VERIFIED' && !verified) {
          verified = true;
          timelineEvents.push({
            title: 'Installation Verified & Completed',
            description: 'Your charger installation has been successfully verified by ACS Energy.',
            date: new Date(ev.created_at).toLocaleString(),
            icon: CheckCircle2,
            color: 'bg-emerald-600'
          });
        }
        if (status === 'REVISIT_REQUIRED') {
          timelineEvents.push({
            title: 'Revisit Scheduled',
            description: 'Additional work or verification is required for your installation.',
            date: new Date(ev.created_at).toLocaleString(),
            icon: Clock,
            color: 'bg-orange-500'
          });
        }
      }
    }
  }

  // Fallback if no audit logs found (e.g. legacy data)
  if (events?.length === 0) {
    if (inst.status !== 'NEW') {
      timelineEvents.push({
        title: 'Order Updating',
        description: `Current status: ${inst.status.replace(/_/g, ' ')}`,
        date: new Date().toLocaleString(),
        icon: Clock,
        color: 'bg-gray-500'
      });
    }
  }

  // Fallback for FileText icon, imported locally
  function FileText(props: any) {
    return (
      <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
      </svg>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <Image src="/logo.png" alt="ACS ENERGY Logo" width={140} height={40} className="object-contain" priority />
          </div>
          <div className="text-sm font-medium text-gray-500">
            Order Tracking
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
          <div className="bg-[#243B36] p-6 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold">Track Your Installation</h1>
              <p className="text-[#D6A84F] font-mono mt-1 text-sm">{token}</p>
            </div>
            <div className="bg-white/10 px-4 py-2 rounded-lg border border-white/20 ">
              <p className="text-xs text-gray-300 uppercase tracking-wider font-semibold mb-0.5">Status</p>
              <p className="font-bold text-lg">{inst.status.replace(/_/g, ' ')}</p>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/50">
            <div className="flex gap-3">
              <div className="bg-white p-2 rounded-full shadow-sm border border-gray-100 h-10 w-10 flex items-center justify-center shrink-0">
                <MapPin className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Location</p>
                <p className="font-medium text-gray-900 mt-0.5">
                  {(() => {
                    const c: any = Array.isArray(inst.customers) ? inst.customers[0] : inst.customers;
                    return c?.city ? `${c.city}, ${c.state}` : 'Location provided';
                  })()}
                </p>
                <p className="text-xs text-gray-400 mt-1">For privacy, full address is hidden.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="bg-white p-2 rounded-full shadow-sm border border-gray-100 h-10 w-10 flex items-center justify-center shrink-0">
                <BatteryCharging className="h-5 w-5 text-[#243B36]" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Charger</p>
                <p className="font-medium text-gray-900 mt-0.5">
                  {(() => {
                    const ch: any = Array.isArray(inst.chargers) ? inst.chargers[0] : inst.chargers;
                    return (
                      <>
                        {ch?.model || 'Standard Charger'}
                        {ch?.power_rating ? ` (${ch.power_rating}kW)` : ''}
                      </>
                    );
                  })()}
                </p>
                <p className="text-xs text-gray-400 mt-1">{inst.category?.replace(/_/g, ' ')}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-8 border-b pb-4">Installation Timeline</h2>
          
          <div className="relative">
            {/* Vertical Line */}
            <div className="absolute left-[23px] top-4 bottom-4 w-0.5 bg-gray-200" aria-hidden="true" />

            <ul className="space-y-8 relative">
              {timelineEvents.map((event, idx) => {
                const Icon = event.icon;
                return (
                  <li key={idx} className="relative flex gap-6 items-start">
                    <div className={`${event.color} h-12 w-12 rounded-full flex items-center justify-center shadow-md border-4 border-white shrink-0 z-10`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="pt-2">
                      <h3 className="text-lg font-bold text-gray-900">{event.title}</h3>
                      <p className="text-sm text-gray-500 mt-1 mb-2">{event.description}</p>
                      <time className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
                        <Clock className="h-3 w-3" /> {event.date}
                      </time>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
        
        <div className="mt-8 text-center text-xs text-gray-400">
          <p>If you have any questions about your installation, please contact your dealership or ACS Energy support.</p>
        </div>

      </main>
    </div>
  );
}
