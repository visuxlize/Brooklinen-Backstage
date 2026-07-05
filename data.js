/**
 * Backstage Showcase — Mock Data
 * All store names, cities, and employee names are fictional.
 * Numbers are realistic retail ops figures.
 */

const STORES = [
  { id: 'S01', name: 'Lincoln Park',    city: 'Chicago, IL',       color: '#2E5B8A', initials: 'LP' },
  { id: 'S02', name: 'Hayes Valley',    city: 'San Francisco, CA', color: '#6B8C6B', initials: 'HV' },
  { id: 'S03', name: 'Capitol Hill',    city: 'Seattle, WA',       color: '#B85C38', initials: 'CH' },
  { id: 'S04', name: 'South End',       city: 'Boston, MA',        color: '#C4A24A', initials: 'SE' },
  { id: 'S05', name: 'Montrose',        city: 'Houston, TX',       color: '#7B5EA7', initials: 'MT' },
  { id: 'S06', name: 'Cherry Creek',    city: 'Denver, CO',        color: '#3D8A6B', initials: 'CC' },
  { id: 'S07', name: 'Midtown',         city: 'Atlanta, GA',       color: '#8A3D3D', initials: 'MK' },
  { id: 'S08', name: 'Arts District',   city: 'Los Angeles, CA',   color: '#4A6B8A', initials: 'AD' },
]

const ACTIVE_STORE = STORES[0] // Lincoln Park as default

const DASHBOARD_DATA = {
  storeId: 'S01',
  date: 'Wednesday, July 2, 2026',
  shift: '9AM – 5PM',
  spa: {
    goal: 4800,
    actual: 3264,
    percent: 68,
    hoursLeft: 3,
  },
  storeSummary: [
    { label: 'Net Revenue',  budget: '$4,800', actual: '$3,264', ly: '$3,891', variance: '-16%' },
    { label: 'Orders',       budget: '22',     actual: '16',     ly: '19',     variance: '-16%' },
    { label: 'AOV',          budget: '$218',   actual: '$204',   ly: '$205',   variance: '-1%'  },
    { label: 'UPT',          budget: '2.4',    actual: '2.1',    ly: '2.2',    variance: '-5%'  },
    { label: 'CVR',          budget: '18%',    actual: '15%',    ly: '16%',    variance: '-2%'  },
    { label: 'Traffic',      budget: '122',    actual: '107',    ly: '118',    variance: '-9%'  },
  ],
  allStores: [
    { name: 'Lincoln Park',  city: 'Chicago, IL',       spa: 68,  revenue: '$3,264', status: 'behind'  },
    { name: 'Hayes Valley',  city: 'San Francisco, CA', spa: 91,  revenue: '$4,732', status: 'on-track' },
    { name: 'Capitol Hill',  city: 'Seattle, WA',       spa: 74,  revenue: '$3,849', status: 'behind'  },
    { name: 'South End',     city: 'Boston, MA',        spa: 105, revenue: '$5,460', status: 'ahead'   },
    { name: 'Montrose',      city: 'Houston, TX',       spa: 83,  revenue: '$4,315', status: 'on-track' },
    { name: 'Cherry Creek',  city: 'Denver, CO',        spa: 62,  revenue: '$3,224', status: 'behind'  },
    { name: 'Midtown',       city: 'Atlanta, GA',       spa: 97,  revenue: '$5,040', status: 'on-track' },
    { name: 'Arts District', city: 'Los Angeles, CA',   spa: 88,  revenue: '$4,573', status: 'on-track' },
  ],
}

const SCHEDULE_DATA = {
  weekOf: 'June 29 – July 5, 2026',
  store: 'Lincoln Park',
  budgetHours: 148,
  trendingHours: 141,
  employees: [
    {
      name: 'Jordan Reyes',
      role: 'Store Leader',
      wtd: '35h',
      shifts: ['10AM–6PM', '10AM–6PM', 'OFF', '9AM–5PM', '9AM–5PM', '10AM–6PM', 'OFF'],
    },
    {
      name: 'Maya Chen',
      role: 'Lead',
      wtd: '32h',
      shifts: ['11AM–7PM', '11AM–7PM', '11AM–7PM', 'OFF', 'OFF', '11AM–7PM', '11AM–7PM'],
    },
    {
      name: 'Tobias Grant',
      role: 'Associate',
      wtd: '28h',
      shifts: ['OFF', '12PM–8PM', '12PM–8PM', '12PM–8PM', '12PM–8PM', 'OFF', '12PM–8PM'],
    },
    {
      name: 'Priya Nair',
      role: 'Associate',
      wtd: '20h',
      shifts: ['10AM–2PM', 'OFF', '10AM–2PM', 'OFF', '10AM–2PM', '10AM–4PM', 'OFF'],
    },
    {
      name: 'Darius Webb',
      role: 'Associate',
      wtd: '24h',
      shifts: ['OFF', '1PM–7PM', 'OFF', '1PM–7PM', '1PM–7PM', '1PM–7PM', 'OFF'],
    },
    {
      name: 'Sofia Morales',
      role: 'Lead',
      wtd: '36h',
      shifts: ['9AM–5PM', 'OFF', '9AM–5PM', '9AM–5PM', '9AM–5PM', 'OFF', '10AM–6PM'],
    },
  ],
  days: ['Sun 6/29', 'Mon 6/30', 'Tue 7/1', 'Wed 7/2', 'Thu 7/3', 'Fri 7/4', 'Sat 7/5'],
  powerHour: ['12–2PM', '12–2PM', '12–2PM', '12–2PM', '1–3PM', '2–4PM', '1–3PM'],
}

const RTO_DATA = {
  pending: [
    {
      id: 1,
      name: 'Tobias Grant',
      type: 'PTO',
      dates: 'July 14 – July 18, 2026',
      submitted: 'June 28, 2026',
      note: 'Family vacation, booked in advance.',
      store: 'Lincoln Park',
    },
    {
      id: 2,
      name: 'Priya Nair',
      type: 'RTO',
      dates: 'July 9, 2026',
      submitted: 'July 1, 2026',
      note: 'Doctor appointment, morning only.',
      store: 'Lincoln Park',
    },
    {
      id: 3,
      name: 'Darius Webb',
      type: 'COMP',
      dates: 'July 11, 2026',
      submitted: 'July 1, 2026',
      note: 'Comp day from the inventory push last month.',
      store: 'Lincoln Park',
    },
  ],
  resolved: [
    {
      id: 4,
      name: 'Sofia Morales',
      type: 'PTO',
      dates: 'June 23 – June 25, 2026',
      status: 'approved',
      leaderNote: 'Approved. Coverage confirmed with Maya.',
      store: 'Lincoln Park',
    },
    {
      id: 5,
      name: 'Maya Chen',
      type: 'RTO',
      dates: 'June 18, 2026',
      status: 'denied',
      leaderNote: 'Denied — floor coverage too thin that day. Please resubmit for a different date.',
      store: 'Lincoln Park',
    },
    {
      id: 6,
      name: 'Jordan Reyes',
      type: 'PTO',
      dates: 'June 5 – June 6, 2026',
      status: 'approved',
      leaderNote: 'Approved.',
      store: 'Lincoln Park',
    },
  ],
}

const TRAFFIC_DATA = {
  store: 'Lincoln Park',
  weekOf: 'June 29 – July 5, 2026',
  stats: {
    totalTraffic: 847,
    trendMultiplier: 1.08,
    peakWindow: '1PM – 3PM',
    allowableHours: 141,
  },
  daily: [
    { day: 'Sun', count: 142, budget: 130, pct: 83 },
    { day: 'Mon', count: 87,  budget: 95,  pct: 51 },
    { day: 'Tue', count: 94,  budget: 90,  pct: 55 },
    { day: 'Wed', count: 107, budget: 110, pct: 62 },
    { day: 'Thu', count: 118, budget: 115, pct: 69 },
    { day: 'Fri', count: 134, budget: 140, pct: 78 },
    { day: 'Sat', count: 165, budget: 155, pct: 96 },
  ],
  hourly: [
    { hour: '10AM', count: 28 },
    { hour: '11AM', count: 52 },
    { hour: '12PM', count: 89 },
    { hour: '1PM',  count: 124 },
    { hour: '2PM',  count: 118 },
    { hour: '3PM',  count: 97  },
    { hour: '4PM',  count: 76  },
    { hour: '5PM',  count: 61  },
    { hour: '6PM',  count: 44  },
    { hour: '7PM',  count: 31  },
  ],
}

// Export for use in page scripts
if (typeof module !== 'undefined') {
  module.exports = { STORES, ACTIVE_STORE, DASHBOARD_DATA, SCHEDULE_DATA, RTO_DATA, TRAFFIC_DATA }
}
