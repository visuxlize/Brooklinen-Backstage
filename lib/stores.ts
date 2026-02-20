export const STORE_CONFIG = [
  {
    id: 101,
    name: 'Williamsburg',
    city: 'Brooklyn, NY',
    color: '#1B4B8A',
    hours: { sun: '11AM–7PM', mon: '11AM–7PM', tue: '11AM–7PM', wed: '11AM–7PM', thu: '11AM–7PM', fri: '11AM–7PM', sat: '11AM–7PM' },
  },
  {
    id: 102,
    name: 'West Village',
    city: 'New York, NY',
    color: '#2D6A4F',
    hours: { sun: '11AM–7PM', mon: '11AM–7PM', tue: '11AM–7PM', wed: '11AM–7PM', thu: '11AM–7PM', fri: '11AM–7PM', sat: '11AM–7PM' },
  },
  {
    id: 103,
    name: 'San Francisco',
    city: 'San Francisco, CA',
    color: '#7B2D8B',
    hours: { sun: '11AM–7PM', mon: '11AM–7PM', tue: '11AM–7PM', wed: '11AM–7PM', thu: '11AM–7PM', fri: '11AM–7PM', sat: '11AM–7PM' },
  },
  {
    id: 104,
    name: 'Santa Monica',
    city: 'Santa Monica, CA',
    color: '#C0392B',
    hours: { sun: '10AM–6PM', mon: '11AM–6PM', tue: '11AM–6PM', wed: '11AM–6PM', thu: '11AM–6PM', fri: '11AM–6PM', sat: '10AM–6PM' },
  },
  {
    id: 105,
    name: 'Philadelphia',
    city: 'Philadelphia, PA',
    color: '#D35400',
    hours: { sun: '11AM–6PM', mon: '10AM–6PM', tue: '10AM–6PM', wed: '10AM–6PM', thu: '10AM–6PM', fri: '10AM–6PM', sat: '10AM–6PM' },
  },
  {
    id: 107,
    name: 'Chicago',
    city: 'Chicago, IL',
    color: '#5D4037',
    hours: { sun: '10AM–6PM', mon: '11AM–7PM', tue: '11AM–7PM', wed: '11AM–7PM', thu: '11AM–7PM', fri: '11AM–7PM', sat: '10AM–7PM' },
  },
  {
    id: 108,
    name: 'San Diego',
    city: 'San Diego, CA',
    color: '#1565C0',
    hours: { sun: '11AM–7PM', mon: '10AM–8PM', tue: '10AM–8PM', wed: '10AM–8PM', thu: '10AM–8PM', fri: '10AM–8PM', sat: '10AM–8PM' },
  },
  {
    id: 109,
    name: 'Washington DC',
    city: 'Washington, DC',
    color: '#4A148C',
    hours: { sun: '11AM–6PM', mon: '11AM–7PM', tue: '11AM–7PM', wed: '11AM–7PM', thu: '11AM–7PM', fri: '10AM–7PM', sat: '10AM–7PM' },
  },
] as const

export type StoreConfig = (typeof STORE_CONFIG)[number]

export function getStore(id: number): StoreConfig | undefined {
  return STORE_CONFIG.find((s) => s.id === id) as StoreConfig | undefined
}
