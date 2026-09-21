import type { Country } from '../engine/types';
export const countries: Country[] = [
  { id: 'uk', name: 'United Kingdom', currency: 'GBP', living: 15000, tuition: 6000, wage: 1 },
  { id: 'ca', name: 'Canada', currency: 'CAD', living: 22000, tuition: 8000, wage: 1.45 },
  { id: 'nz', name: 'New Zealand', currency: 'NZD', living: 25000, tuition: 7000, wage: 1.6 },
];
export const jobs = [
  { id: 'barista', name: 'Café team member', salary: 23000, smarts: 0, degree: false },
  { id: 'maker', name: 'Workshop technician', salary: 31000, smarts: 40, degree: false },
  { id: 'designer', name: 'Product designer', salary: 44000, smarts: 60, degree: true },
  { id: 'researcher', name: 'Research scientist', salary: 56000, smarts: 80, degree: true },
];
