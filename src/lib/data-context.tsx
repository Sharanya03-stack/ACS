"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { OEM, Dealer, Customer, Vehicle, Charger, Partner, Technician, Installation, InstallationStatus, InstallationNote } from './types';

interface DataContextType {
  oems: OEM[];
  dealers: Dealer[];
  customers: Customer[];
  vehicles: Vehicle[];
  chargers: Charger[];
  partners: Partner[];
  technicians: Technician[];
  installations: Installation[];

  // Mutations
  addInstallation: (inst: Installation) => void;
  updateInstallationStatus: (id: string, status: InstallationStatus) => void;
  assignPartner: (id: string, partnerId: string) => void;
  assignTechnician: (id: string, techId: string) => void;
  addNote: (id: string, note: InstallationNote) => void;
  updateChecklistAndPhotos: (id: string, checklist: any[], photos: any[]) => void;
  verifyInstallation: (id: string) => void;
  rejectInstallation: (id: string, reason: string) => void;
  
  createVehicleSale: (customer: Customer, vehicle: Vehicle, charger: Charger) => string;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// --- INITIAL MOCK DATA ---
const INITIAL_OEMS: OEM[] = [
  { id: 'OEM-MAH-001', name: 'Mahindra Electric', contactPerson: 'Arun Kumar', email: 'arun@mahindra.com', phone: '9876543210', address: 'Mumbai, MH', status: 'ACTIVE' },
  { id: 'OEM-TAT-002', name: 'Tata Motors', contactPerson: 'Neha Sharma', email: 'neha@tata.com', phone: '9876543211', address: 'Pune, MH', status: 'ACTIVE' },
  { id: 'OEM-MGI-003', name: 'MG Motor India', contactPerson: 'Vikram Singh', email: 'vikram@mgmotor.co.in', phone: '9876543212', address: 'Gurugram, HR', status: 'ACTIVE' },
];

const INITIAL_DEALERS: Dealer[] = [
  { id: 'DLR-PUN-014', name: 'Pune EV Motors', oemId: 'OEM-MAH-001', contactPerson: 'Rajesh Patil', email: 'rajesh@puneevmotors.com', phone: '9876543213', address: 'Shivaji Nagar', city: 'Pune', state: 'Maharashtra', pincode: '411005', status: 'ACTIVE' },
  { id: 'DLR-BLR-001', name: 'Mahindra Bangalore Central', oemId: 'OEM-MAH-001', contactPerson: 'Suresh Iyer', email: 'suresh@mahblr.com', phone: '9876543214', address: 'Koramangala', city: 'Bengaluru', state: 'Karnataka', pincode: '560034', status: 'ACTIVE' },
  { id: 'DLR-BLR-002', name: 'Tata Motors Whitefield', oemId: 'OEM-TAT-002', contactPerson: 'Anita Desai', email: 'anita@tatablr.com', phone: '9876543215', address: 'Whitefield', city: 'Bengaluru', state: 'Karnataka', pincode: '560066', status: 'ACTIVE' },
  { id: 'DLR-DEL-001', name: 'MG Delhi South', oemId: 'OEM-MGI-003', contactPerson: 'Amit Gupta', email: 'amit@mgdelhi.com', phone: '9876543216', address: 'South Extension', city: 'New Delhi', state: 'Delhi', pincode: '110049', status: 'ACTIVE' },
];

const INITIAL_CUSTOMERS: Customer[] = [
  { id: 'CUS-000928', name: 'Rahul Sharma', phone: '9988776655', email: 'rahul@example.com', address: 'Kalyani Nagar', city: 'Pune', state: 'Maharashtra', pincode: '411014', dealerId: 'DLR-PUN-014' },
  { id: 'CUS-000929', name: 'Priya Patel', phone: '9988776656', email: 'priya@example.com', address: 'Indiranagar', city: 'Bengaluru', state: 'Karnataka', pincode: '560038', dealerId: 'DLR-BLR-002' },
];

const INITIAL_VEHICLES: Vehicle[] = [
  { id: 'MAH123456789', model: 'Mahindra XUV.e8', registrationNumber: 'MH12AB1234', saleDate: '2026-08-10', deliveryDate: '2026-08-12', customerId: 'CUS-000928', dealerId: 'DLR-PUN-014', oemId: 'OEM-MAH-001' },
  { id: 'TAT987654321', model: 'Tata Nexon EV', registrationNumber: 'KA03XY9876', saleDate: '2026-08-11', deliveryDate: '2026-08-13', customerId: 'CUS-000929', dealerId: 'DLR-BLR-002', oemId: 'OEM-TAT-002' },
];

const INITIAL_CHARGERS: Charger[] = [
  { id: 'ACS-WLX-000582', model: '7.4kW AC Wallbox', power: '7.4kW', suppliedDate: '2026-08-10', vehicleId: 'MAH123456789', customerId: 'CUS-000928' },
  { id: 'ACS-WLX-000583', model: '3.3kW AC Wallbox', power: '3.3kW', suppliedDate: '2026-08-11', vehicleId: 'TAT987654321', customerId: 'CUS-000929' },
];

const INITIAL_PARTNERS: Partner[] = [
  { id: 'IP-MH-004', name: 'VoltServe Installations', contactPerson: 'Sanjay Dutt', phone: '9123456780', email: 'sanjay@voltserve.com', serviceRegions: ['Pune', 'Mumbai'], status: 'ACTIVE' },
  { id: 'IP-KA-001', name: 'EcoCharge Partners', contactPerson: 'Manoj Gowda', phone: '9123456781', email: 'manoj@ecocharge.com', serviceRegions: ['Bengaluru', 'Mysuru'], status: 'ACTIVE' },
];

const INITIAL_TECHNICIANS: Technician[] = [
  { id: 'TECH-029', name: 'Rahul Patil', partnerId: 'IP-MH-004', phone: '9234567890', location: 'Pune', status: 'ACTIVE' },
  { id: 'TECH-030', name: 'Vikram Singh', partnerId: 'IP-MH-004', phone: '9234567891', location: 'Mumbai', status: 'ACTIVE' },
  { id: 'TECH-031', name: 'Suresh Kumar', partnerId: 'IP-KA-001', phone: '9234567892', location: 'Bengaluru', status: 'ACTIVE' },
];

const INITIAL_INSTALLATIONS: Installation[] = [
  {
    id: 'ACS-INST-2026-000582',
    status: 'NEW', // Starting as NEW to fulfill step 3/4 of the demo
    customerId: 'CUS-000928',
    vehicleId: 'MAH123456789',
    chargerId: 'ACS-WLX-000582',
    dealerId: 'DLR-PUN-014',
    oemId: 'OEM-MAH-001',
    dateCreated: '2026-08-14T09:00:00Z',
    notes: []
  },
  {
    id: 'ACS-INST-2026-000583',
    status: 'IN PROGRESS',
    customerId: 'CUS-000929',
    vehicleId: 'TAT987654321',
    chargerId: 'ACS-WLX-000583',
    dealerId: 'DLR-BLR-002',
    oemId: 'OEM-TAT-002',
    partnerId: 'IP-KA-001',
    technicianId: 'TECH-031',
    dateCreated: '2026-08-13T10:00:00Z',
    scheduledDate: '2026-08-14',
    startedAt: '2026-08-14T11:00:00Z',
    notes: []
  }
];

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [oems, setOems] = useState<OEM[]>(INITIAL_OEMS);
  const [dealers, setDealers] = useState<Dealer[]>(INITIAL_DEALERS);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [vehicles, setVehicles] = useState<Vehicle[]>(INITIAL_VEHICLES);
  const [chargers, setChargers] = useState<Charger[]>(INITIAL_CHARGERS);
  const [partners, setPartners] = useState<Partner[]>(INITIAL_PARTNERS);
  const [technicians, setTechnicians] = useState<Technician[]>(INITIAL_TECHNICIANS);
  const [installations, setInstallations] = useState<Installation[]>(INITIAL_INSTALLATIONS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from LocalStorage
  useEffect(() => {
    const loadData = (key: string, setter: any, fallback: any) => {
      const stored = localStorage.getItem(`acs_mock_${key}`);
      if (stored) {
        try { setter(JSON.parse(stored)); } catch (e) { setter(fallback); }
      } else {
        setter(fallback);
      }
    };

    loadData('oems', setOems, INITIAL_OEMS);
    loadData('dealers', setDealers, INITIAL_DEALERS);
    loadData('customers', setCustomers, INITIAL_CUSTOMERS);
    loadData('vehicles', setVehicles, INITIAL_VEHICLES);
    loadData('chargers', setChargers, INITIAL_CHARGERS);
    loadData('partners', setPartners, INITIAL_PARTNERS);
    loadData('technicians', setTechnicians, INITIAL_TECHNICIANS);
    loadData('installations', setInstallations, INITIAL_INSTALLATIONS);
    setIsLoaded(true);
  }, []);

  // Sync to LocalStorage
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem('acs_mock_oems', JSON.stringify(oems));
    localStorage.setItem('acs_mock_dealers', JSON.stringify(dealers));
    localStorage.setItem('acs_mock_customers', JSON.stringify(customers));
    localStorage.setItem('acs_mock_vehicles', JSON.stringify(vehicles));
    localStorage.setItem('acs_mock_chargers', JSON.stringify(chargers));
    localStorage.setItem('acs_mock_partners', JSON.stringify(partners));
    localStorage.setItem('acs_mock_technicians', JSON.stringify(technicians));
    localStorage.setItem('acs_mock_installations', JSON.stringify(installations));
  }, [oems, dealers, customers, vehicles, chargers, partners, technicians, installations, isLoaded]);

  // Mutations
  const updateInstallationStatus = useCallback((id: string, status: InstallationStatus) => {
    setInstallations(prev => prev.map(inst => inst.id === id ? { ...inst, status } : inst));
  }, []);

  const assignPartner = useCallback((id: string, partnerId: string) => {
    setInstallations(prev => prev.map(inst => inst.id === id ? { ...inst, partnerId, status: 'PARTNER ASSIGNED' } : inst));
  }, []);

  const assignTechnician = useCallback((id: string, techId: string) => {
    setInstallations(prev => prev.map(inst => inst.id === id ? { ...inst, technicianId: techId, status: 'TECHNICIAN ASSIGNED' } : inst));
  }, []);

  const addNote = useCallback((id: string, note: InstallationNote) => {
    setInstallations(prev => prev.map(inst => inst.id === id ? { ...inst, notes: [...inst.notes, note] } : inst));
  }, []);

  const updateChecklistAndPhotos = useCallback((id: string, checklist: any[], photos: any[]) => {
    setInstallations(prev => prev.map(inst => inst.id === id ? { ...inst, checklist, photos, status: 'UNDER VERIFICATION', completedAt: new Date().toISOString() } : inst));
  }, []);

  const verifyInstallation = useCallback((id: string) => {
    setInstallations(prev => prev.map(inst => inst.id === id ? { ...inst, status: 'VERIFIED', verifiedAt: new Date().toISOString() } : inst));
  }, []);

  const rejectInstallation = useCallback((id: string, reason: string) => {
    setInstallations(prev => prev.map(inst => inst.id === id ? { ...inst, status: 'REVISIT REQUIRED', rejectionReason: reason } : inst));
  }, []);

  const addInstallation = useCallback((inst: Installation) => {
    setInstallations(prev => [inst, ...prev]);
  }, []);

  const createVehicleSale = useCallback((customer: Customer, vehicle: Vehicle, charger: Charger) => {
    setCustomers(prev => [customer, ...prev]);
    setVehicles(prev => [vehicle, ...prev]);
    setChargers(prev => [charger, ...prev]);

    const instId = `ACS-INST-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const inst: Installation = {
      id: instId,
      status: 'NEW',
      customerId: customer.id,
      vehicleId: vehicle.id,
      chargerId: charger.id,
      dealerId: customer.dealerId,
      oemId: vehicle.oemId,
      dateCreated: new Date().toISOString(),
      notes: []
    };
    addInstallation(inst);
    return instId;
  }, [addInstallation]);

  return (
    <DataContext.Provider value={{
      oems, dealers, customers, vehicles, chargers, partners, technicians, installations,
      addInstallation, updateInstallationStatus, assignPartner, assignTechnician, addNote,
      updateChecklistAndPhotos, verifyInstallation, rejectInstallation, createVehicleSale
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
