
-- Employees table
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  sub_category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to employees" ON public.employees FOR ALL USING (true) WITH CHECK (true);

-- Time slots table
CREATE TABLE public.time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time TEXT NOT NULL,
  label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to time_slots" ON public.time_slots FOR ALL USING (true) WITH CHECK (true);

-- Daily classes table
CREATE TABLE public.daily_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_date DATE NOT NULL,
  time_slot_id UUID NOT NULL REFERENCES public.time_slots(id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(class_date, time_slot_id)
);

ALTER TABLE public.daily_classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to daily_classes" ON public.daily_classes FOR ALL USING (true) WITH CHECK (true);

-- Attendance table
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  daily_class_id UUID NOT NULL REFERENCES public.daily_classes(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, daily_class_id)
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to attendance" ON public.attendance FOR ALL USING (true) WITH CHECK (true);

-- Seed default time slots
INSERT INTO public.time_slots (time, label, sort_order) VALUES
('06:00', '06:00 AM', 1),
('10:00', '10:00 AM', 2),
('15:00', '03:00 PM', 3);

-- Seed employees
INSERT INTO public.employees (employee_id, name, category, sub_category) VALUES
('RSI 891', 'RSI 891', 'RSI', NULL),
('ARSI 145', 'ARSI 145', 'ARSI', NULL),
('ARSI 345', 'ARSI 345', 'ARSI', NULL),
('ARSI 1106', 'ARSI 1106', 'ARSI', NULL),
('ARSI 869', 'ARSI 869', 'ARSI', NULL),
('HC 811', 'HC 811', 'HC', NULL),
('HC 1508', 'HC 1508', 'HC', NULL),
('HC 1493', 'HC 1493', 'HC', NULL),
('HC 1496', 'HC 1496', 'HC', NULL),
('HC 1986', 'HC 1986', 'HC', NULL),
('HC 1831', 'HC 1831', 'HC', NULL),
('HC 1801', 'HC 1801', 'HC', NULL),
('HC 1832', 'HC 1832', 'HC', NULL),
('HC 1932', 'HC 1932', 'HC', NULL),
('HC 1478', 'HC 1478', 'HC', NULL),
('HC 1536', 'HC 1536', 'HC', NULL),
('PC 1898', 'PC 1898', 'PC', 'PSO'),
('PC 1922', 'PC 1922', 'PC', 'PSO'),
('PC 1954', 'PC 1954', 'PC', 'PSO'),
('PC 2263', 'PC 2263', 'PC', 'PSO'),
('PC 2322', 'PC 2322', 'PC', 'PSO'),
('PC 1267', 'PC 1267', 'PC', 'PSO'),
('PC 790', 'PC 790', 'PC', 'MT'),
('PC 1246', 'PC 1246', 'PC', 'MT'),
('PC 1107', 'PC 1107', 'PC', 'MT'),
('PC 2393', 'PC 2393', 'PC', 'MT'),
('PC 2015', 'PC 2015', 'PC', 'Staff'),
('PC 1998', 'PC 1998', 'PC', 'Staff'),
('PC 245', 'PC 245', 'PC', 'Staff'),
('PC 1893', 'PC 1893', 'PC', 'Staff'),
('PC 1887', 'PC 1887', 'PC', 'Staff'),
('PC 2364', 'PC 2364', 'PC', 'STF'),
('PC 4344', 'PC 4344', 'PC', 'STF'),
('PC 509', 'PC 509', 'PC', 'General Duty'),
('PC 2115', 'PC 2115', 'PC', 'General Duty'),
('PC 2157', 'PC 2157', 'PC', 'General Duty'),
('PC 2158', 'PC 2158', 'PC', 'General Duty'),
('PC 2165', 'PC 2165', 'PC', 'General Duty'),
('PC 2357', 'PC 2357', 'PC', 'General Duty'),
('PC 2099', 'PC 2099', 'PC', 'General Duty'),
('PC 237', 'PC 237', 'PC', 'General Duty'),
('PC 2056', 'PC 2056', 'PC', 'General Duty'),
('PC 2105', 'PC 2105', 'PC', 'General Duty'),
('PC 2369', 'PC 2369', 'PC', 'General Duty');
