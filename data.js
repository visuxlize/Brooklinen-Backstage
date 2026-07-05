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
  dayNums: ['29', '30', '1', '2', '3', '4', '5'],
  powerHour: ['12–2PM', '12–2PM', '12–2PM', '12–2PM', '1–3PM', '2–4PM', '1–3PM'],
  budgetByDay: [685, 623, 598, 712, 688, 760, 734],
  lyByDay:     [702, 598, 611, 685, 674, 788, 751],
  actualByDay: [28, 22, 22, 26, 22, 14, 7],
  weekIdx: 4,
  totalWeeks: 8,
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

const DASHBOARD_MODULES = [
  {
    title: 'Schedule',
    desc: 'Build and publish the weekly staff schedule with budget tracking.',
    href: 'schedule.html',
    color: 'linear-gradient(135deg,#2563EB,#1D4ED8)',
    icon: 'calendar',
  },
  {
    title: 'Daily Ops',
    desc: 'Morning wakeup, goal metrics, and the employee zoning chart.',
    href: 'daily-ops.html',
    color: 'linear-gradient(135deg,#7C3AED,#6D28D9)',
    icon: 'clipboard',
  },
  {
    title: 'Availability',
    desc: 'Review team availability windows before building schedules.',
    href: '#',
    color: 'linear-gradient(135deg,#16A34A,#15803D)',
    icon: 'users',
  },
  {
    title: 'Traffic',
    desc: 'Store traffic trends, peak windows, and staffing projections.',
    href: 'traffic.html',
    color: 'linear-gradient(135deg,#F59E0B,#D97706)',
    icon: 'chart',
  },
  {
    title: 'Time Off',
    desc: 'Approve or deny PTO, RTO, and comp day requests.',
    href: 'rto.html',
    color: 'linear-gradient(135deg,#475569,#334155)',
    icon: 'file',
  },
]

const CALENDAR_DATA = {
  connected: true,
  month: 'July 2026',
  today: 2,
  daysInMonth: 31,
  startWeekday: 3, // Wed 7/1 is a Wednesday -> index of the 1st (0=Sun)
  eventDays: [2, 4, 9, 14, 18, 24],
  events: [
    { when: 'Today, 3:00 PM', title: 'Regional walkthrough w/ Area Manager' },
    { when: 'Fri, Jul 4', title: 'Store closed — Independence Day', promo: true },
    { when: 'Tue, Jul 14', title: 'Summer Sale kickoff', promo: true },
    { when: 'Sat, Jul 18', title: 'New hire onboarding — Priya shadow shift' },
  ],
}

const PROMOTIONS_DATA = [
  { name: 'Summer Linen Sale', dates: 'Jul 14 – Jul 27, 2026', desc: '20% off all linen sheet sets storewide.' },
  { name: 'Referral Weekend', dates: 'Jul 18 – Jul 20, 2026', desc: 'Double loyalty points for referred customers.' },
  { name: 'Back to School Bedding', dates: 'Aug 1 – Aug 14, 2026', desc: 'Dorm bundle promo, feature near entrance.' },
  { name: 'Labor Day Preview', dates: 'Aug 28 – Sep 1, 2026', desc: 'Early access pricing for loyalty members.' },
]

const QUICK_LINKS_DATA = [
  { label: 'Visual Merchandising Guide', url: 'brooklinen.com/vm-guide' },
  { label: 'POS Troubleshooting', url: 'brooklinen.com/pos-help' },
  { label: 'Store Ops Handbook', url: 'brooklinen.com/handbook' },
]

// Extra traffic tables (5-week projection, peak hours, weekly history)
TRAFFIC_DATA.projection = {
  lyTraffic:    [612, 598, 634, 701, 745],
  projected:    [660, 645, 690, 758, 812],
  dayShare: {
    Sun: [17, 16, 17, 18, 17],
    Mon: [11, 10, 11, 11, 11],
    Tue: [11, 11, 11, 11, 11],
    Wed: [12, 13, 12, 13, 12],
    Thu: [13, 13, 13, 14, 14],
    Fri: [16, 16, 16, 15, 16],
    Sat: [20, 21, 20, 18, 19],
  },
  weeks: ['Wk of Jul 6', 'Wk of Jul 13', 'Wk of Jul 20', 'Wk of Jul 27', 'Wk of Aug 3'],
}

TRAFFIC_DATA.peakHours = [
  { day: 'Sun', peak: '1PM – 2PM', second: '12PM – 1PM', slow: '10AM – 11AM', window: '1–3PM', pctOfDaily: '19%' },
  { day: 'Mon', peak: '5PM – 6PM', second: '12PM – 1PM', slow: '10AM – 11AM', window: '5–7PM', pctOfDaily: '16%' },
  { day: 'Tue', peak: '12PM – 1PM', second: '5PM – 6PM', slow: '10AM – 11AM', window: '12–2PM', pctOfDaily: '17%' },
  { day: 'Wed', peak: '1PM – 3PM', second: '5PM – 6PM', slow: '10AM – 11AM', window: '1–3PM', pctOfDaily: '18%' },
  { day: 'Thu', peak: '1PM – 3PM', second: '4PM – 5PM', slow: '10AM – 11AM', window: '1–3PM', pctOfDaily: '17%' },
  { day: 'Fri', peak: '2PM – 4PM', second: '5PM – 6PM', slow: '10AM – 11AM', window: '2–4PM', pctOfDaily: '19%' },
  { day: 'Sat', peak: '1PM – 3PM', second: '11AM – 12PM', slow: '6PM – 7PM', window: '1–3PM', pctOfDaily: '22%' },
]

TRAFFIC_DATA.history = [
  { weekOf: 'Jun 29', sun: 142, mon: 87, tue: 94, wed: 107, thu: 118, fri: 134, sat: 165, total: 847 },
  { weekOf: 'Jun 22', sun: 128, mon: 91, tue: 88, wed: 99, thu: 112, fri: 140, sat: 158, total: 816 },
  { weekOf: 'Jun 15', sun: 135, mon: 84, tue: 97, wed: 104, thu: 120, fri: 128, sat: 149, total: 817 },
  { weekOf: 'Jun 8',  sun: 119, mon: 79, tue: 85, wed: 96,  thu: 103, fri: 122, sat: 144, total: 748 },
  { weekOf: 'Jun 1',  sun: 147, mon: 96, tue: 101, wed: 112, thu: 125, fri: 138, sat: 171, total: 890 },
  { weekOf: 'May 25', sun: 131, mon: 88, tue: 92,  wed: 105, thu: 114, fri: 130, sat: 156, total: 816 },
  { weekOf: 'May 18', sun: 124, mon: 82, tue: 90,  wed: 98,  thu: 108, fri: 124, sat: 151, total: 777 },
  { weekOf: 'May 11', sun: 138, mon: 93, tue: 96,  wed: 110, thu: 119, fri: 133, sat: 162, total: 851 },
]

const DAILY_OPS_DATA = {
  store: 'Lincoln Park',
  date: 'Wednesday, July 2, 2026',
  links: {
    cashlog: { label: 'Cashlog', url: 'internal.brooklinen.com/cashlog' },
    returns: { label: 'Returns', url: 'internal.brooklinen.com/returns' },
  },
  metrics: {
    budget: 4800,
    ly: 3891,
    orderGoal: 22,
    aovGoal: 218,
    uptGoal: 2.4,
    conversionGoal: 18,
  },
  running: { wtd: 4, mtd: -2, qtd: 6 },
  notes: {
    promotions: 'Super Plush robes on Last Call, 40% off. Call out at the register.',
    productUpdate: 'Airweave rebranded as Breezeweave — update talking points, same product.',
    staffRecognition: 'Shoutout to Maya for hitting UPT goal 3 days running this week.',
    tasks: 'Restock linen wall, confirm Power Hour coverage 1–3PM, walk the stockroom.',
  },
  employees: [
    { name: 'Jordan Reyes',  role: 'LOD',           segments: [['Opening', 0, 15], ['LOD', 15, 60], ['Lunch', 60, 68], ['LOD', 68, 100]] },
    { name: 'Maya Chen',     role: 'Floor Support',  segments: [['Opening', 0, 10], ['Floor Support', 10, 55], ['Lunch', 55, 63], ['Visual', 63, 100]] },
    { name: 'Tobias Grant',  role: 'Stockroom',      segments: [['Stockroom', 0, 45], ['Lunch', 45, 53], ['Floor Support', 53, 100]] },
    { name: 'Priya Nair',    role: 'Visual',         segments: [['Visual', 0, 40], ['Floor Support', 40, 100]] },
    { name: 'Darius Webb',   role: 'Floor Support',  segments: [['Floor Support', 0, 50], ['Lunch', 50, 58], ['Closing', 58, 100]] },
    { name: 'Sofia Morales', role: 'Closing',        segments: [['Floor Support', 0, 60], ['Lunch', 60, 68], ['Closing', 68, 100]] },
  ],
}

// Export for use in page scripts
if (typeof module !== 'undefined') {
  module.exports = {
    STORES, ACTIVE_STORE, DASHBOARD_DATA, SCHEDULE_DATA, RTO_DATA, TRAFFIC_DATA,
    DASHBOARD_MODULES, CALENDAR_DATA, PROMOTIONS_DATA, QUICK_LINKS_DATA, DAILY_OPS_DATA,
  }
}
