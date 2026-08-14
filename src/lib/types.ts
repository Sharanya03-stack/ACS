export type InstallationStatus =
  | 'NEW'
  | 'PARTNER ASSIGNED'
  | 'TECHNICIAN ASSIGNED'
  | 'SCHEDULED'
  | 'IN PROGRESS'
  | 'COMPLETED'
  | 'UNDER VERIFICATION'
  | 'VERIFIED'
  | 'ON HOLD'
  | 'RESCHEDULED'
  | 'REVISIT REQUIRED'
  | 'CANCELLED'
  | 'FAILED';

export interface OEM {
  id: string; // e.g. OEM-MAH-001
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Dealer {
  id: string; // e.g. DLR-PUN-014
  name: string;
  oemId: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Customer {
  id: string; // e.g. CUS-000928
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gpsLocation?: string;
  dealerId: string;
}

export interface Vehicle {
  id: string; // VIN, e.g. MAH123456789
  model: string;
  registrationNumber: string;
  saleDate: string;
  deliveryDate: string;
  customerId: string;
  dealerId: string;
  oemId: string;
}

export interface Charger {
  id: string; // Serial, e.g. ACS-WLX-000582
  model: string;
  power: string;
  suppliedDate: string;
  vehicleId: string;
  customerId: string;
}

export interface Partner {
  id: string; // e.g. IP-MH-004
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  serviceRegions: string[];
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Technician {
  id: string; // e.g. TECH-029
  name: string;
  partnerId: string;
  phone: string;
  location: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface InstallationNote {
  id: string;
  authorId: string;
  authorName: string;
  timestamp: string;
  content: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  status: 'YES' | 'NO' | 'N/A' | 'PENDING';
}

export interface PhotoUpload {
  id: string;
  category: string;
  url: string; // object URL or base64
  timestamp: string;
}

export interface Installation {
  id: string; // e.g. ACS-INST-2026-000582
  status: InstallationStatus;
  
  customerId: string;
  vehicleId: string;
  chargerId: string;
  dealerId: string;
  oemId: string;
  
  partnerId?: string;
  technicianId?: string;
  
  dateCreated: string;
  scheduledDate?: string;
  startedAt?: string;
  completedAt?: string;
  verifiedAt?: string;

  notes: InstallationNote[];
  checklist?: ChecklistItem[];
  photos?: PhotoUpload[];
  
  rejectionReason?: string;
}

export interface DashboardMetrics {
  totalOEMs: number;
  totalDealerships: number;
  totalPartners: number;
  totalTechnicians: number;
  totalVehicles: number;
  totalChargers: number;
  pendingInstallations: number;
  completedInstallations: number;
  revisitRequired: number;
}
