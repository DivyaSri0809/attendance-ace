import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FileText, Calendar, Clock, Users, BookOpen } from "lucide-react";
import { sortEmployees } from "@/lib/employeeSort";

type Employee = Tables<"employees">;
type TimeSlot = Tables<"time_slots">;

/* ── Date-Wise Report ───────────────────────────────── */
const DateWiseReport = () => {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pivot, setPivot] = useState<Map<string, Map<string, string>>>(new Map());
  const [classMap, setClassMap] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState({ present: 0, absent: 0, unmarked: 0 });

  useEffect(() => {
    const load = async () => {
      const [slotRes, empRes] = await Promise.all([
        supabase.from("time_slots").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("employees").select("*").eq("is_active", true),
      ]);
      setSlots(slotRes.data || []);
      setEmployees(sortEmployees(empRes.data || []));
    };
    load();
  }, []);

  useEffect(() => {
    if (!date || slots.length === 0 || employees.length === 0) return;
    const load = async () => {
      const { data: classes } = await supabase
        .from("daily_classes")
        .select("*")
        .eq("class_date", date);

      const cMap: Record<string, string> = {};
      const slotToClass: Record<string, string> = {};
      classes?.forEach((c) => {
        slotToClass[c.time_slot_id] = c.id;
        cMap[c.time_slot_id] = c.class_name;
      });
      setClassMap(cMap);

      const classIds = classes?.map((c) => c.id) || [];
      if (classIds.length === 0) {
        setPivot(new Map());
        setSummary({ present: 0, absent: 0, unmarked: employees.length * slots.length });
        return;
      }

      const { data: att } = await supabase
        .from("attendance")
        .select("employee_id, daily_class_id, status")
        .in("daily_class_id", classIds);

      const classToSlot: Record<string, string> = {};
      classes?.forEach((c) => {
        classToSlot[c.id] = c.time_slot_id;
      });

      const p = new Map<string, Map<string, string>>();
      att?.forEach((a) => {
        const slotId = classToSlot[a.daily_class_id];
        if (!p.has(a.employee_id)) p.set(a.employee_id, new Map());
        p.get(a.employee_id)!.set(slotId, a.status);
      });
      setPivot(p);

      let present = 0, absent = 0;
      att?.forEach((a) => {
        if (a.status === "present") present++;
        else absent++;
      });
      setSummary({
        present,
        absent,
        unmarked: employees.length * slots.length - present - absent,
      });
    };
    load();
  }, [date, slots, employees]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <div className="space-y-2 w-full sm:w-auto">
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="flex gap-3 text-sm">
          <Badge variant="default">Present: {summary.present}</Badge>
          <Badge variant="secondary">Absent: {summary.absent}</Badge>
          <Badge variant="outline">Unmarked: {summary.unmarked}</Badge>
        </div>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-card z-10">Employee</TableHead>
                <TableHead>Category</TableHead>
                {slots.map((s) => (
                  <TableHead key={s.id} className="text-center min-w-[100px]">
                    {s.label}
                    {classMap[s.id] && (
                      <div className="text-[10px] font-normal text-muted-foreground">
                        {classMap[s.id]}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium sticky left-0 bg-card z-10">
                    {emp.employee_id}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {emp.category}{emp.sub_category ? ` · ${emp.sub_category}` : ""}
                    </span>
                  </TableCell>
                  {slots.map((s) => {
                    const status = pivot.get(emp.id)?.get(s.id);
                    return (
                      <TableCell key={s.id} className="text-center">
                        {status === "present" ? (
                          <Badge variant="default" className="text-xs">P</Badge>
                        ) : status === "absent" ? (
                          <Badge variant="destructive" className="text-xs">A</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

/* ── Employee-Wise Report ───────────────────────────── */
const EmployeeWiseReport = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [records, setRecords] = useState<
    Array<{ date: string; slot: string; className: string; status: string }>
  >([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("employees").select("*").eq("is_active", true);
      setEmployees(sortEmployees(data || []));
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedEmpId) {
      setRecords([]);
      return;
    }
    const load = async () => {
      const { data } = await supabase
        .from("attendance")
        .select("status, daily_classes(class_date, class_name, time_slots(label))")
        .eq("employee_id", selectedEmpId)
        .order("created_at", { ascending: false });

      const rows = (data || []).map((r: any) => ({
        date: r.daily_classes?.class_date || "",
        slot: r.daily_classes?.time_slots?.label || "",
        className: r.daily_classes?.class_name || "",
        status: r.status,
      }));
      rows.sort((a: any, b: any) => b.date.localeCompare(a.date));
      setRecords(rows);
    };
    load();
  }, [selectedEmpId]);

  const selected = employees.find((e) => e.id === selectedEmpId);
  const presentCount = records.filter((r) => r.status === "present").length;

  return (
    <div className="space-y-4">
      <div className="space-y-2 max-w-xs">
        <Label>Select Employee</Label>
        <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
          <SelectTrigger>
            <SelectValue placeholder="Choose employee..." />
          </SelectTrigger>
          <SelectContent>
            {employees.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.employee_id} ({e.category})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selected && records.length > 0 && (
        <div className="flex gap-3 text-sm">
          <Badge variant="default">
            Present: {presentCount}
          </Badge>
          <Badge variant="secondary">
            Absent: {records.length - presentCount}
          </Badge>
          <Badge variant="outline">
            Total: {records.length}
          </Badge>
        </div>
      )}

      {records.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time Slot</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.date}</TableCell>
                    <TableCell>{r.slot}</TableCell>
                    <TableCell>{r.className}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "present" ? "default" : "destructive"} className="text-xs">
                        {r.status === "present" ? "P" : "A"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {selectedEmpId && records.length === 0 && (
        <p className="text-sm text-muted-foreground py-4">No attendance records found.</p>
      )}
    </div>
  );
};

/* ── Slot-Wise Report ───────────────────────────────── */
const SlotWiseReport = () => {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [rows, setRows] = useState<
    Array<{ date: string; className: string; present: number; absent: number }>
  >([]);

  useEffect(() => {
    supabase.from("time_slots").select("*").order("sort_order").then(({ data }) => setSlots(data || []));
  }, []);

  useEffect(() => {
    if (!selectedSlotId) {
      setRows([]);
      return;
    }
    const load = async () => {
      const { data: classes } = await supabase
        .from("daily_classes")
        .select("id, class_date, class_name")
        .eq("time_slot_id", selectedSlotId)
        .order("class_date", { ascending: false });

      if (!classes || classes.length === 0) {
        setRows([]);
        return;
      }

      const ids = classes.map((c) => c.id);
      const { data: att } = await supabase
        .from("attendance")
        .select("daily_class_id, status")
        .in("daily_class_id", ids);

      const countMap: Record<string, { present: number; absent: number }> = {};
      att?.forEach((a) => {
        if (!countMap[a.daily_class_id]) countMap[a.daily_class_id] = { present: 0, absent: 0 };
        if (a.status === "present") countMap[a.daily_class_id].present++;
        else countMap[a.daily_class_id].absent++;
      });

      setRows(
        classes.map((c) => ({
          date: c.class_date,
          className: c.class_name,
          present: countMap[c.id]?.present || 0,
          absent: countMap[c.id]?.absent || 0,
        }))
      );
    };
    load();
  }, [selectedSlotId]);

  return (
    <div className="space-y-4">
      <div className="space-y-2 max-w-xs">
        <Label>Select Time Slot</Label>
        <Select value={selectedSlotId} onValueChange={setSelectedSlotId}>
          <SelectTrigger>
            <SelectValue placeholder="Choose slot..." />
          </SelectTrigger>
          <SelectContent>
            {slots.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {rows.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead className="text-center">Present</TableHead>
                  <TableHead className="text-center">Absent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.date}</TableCell>
                    <TableCell>{r.className}</TableCell>
                    <TableCell className="text-center font-medium text-primary">{r.present}</TableCell>
                    <TableCell className="text-center font-medium text-destructive">{r.absent}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {selectedSlotId && rows.length === 0 && (
        <p className="text-sm text-muted-foreground py-4">No classes found for this time slot.</p>
      )}
    </div>
  );
};

/* ── Class-Wise Report ──────────────────────────────── */
const ClassWiseReport = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [rows, setRows] = useState<
    Array<{ date: string; slot: string; className: string; present: number; absent: number }>
  >([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setSearched(true);

    const { data: classes } = await supabase
      .from("daily_classes")
      .select("id, class_date, class_name, time_slots(label)")
      .ilike("class_name", `%${searchTerm.trim()}%`)
      .order("class_date", { ascending: false });

    if (!classes || classes.length === 0) {
      setRows([]);
      return;
    }

    const ids = classes.map((c) => c.id);
    const { data: att } = await supabase
      .from("attendance")
      .select("daily_class_id, status")
      .in("daily_class_id", ids);

    const countMap: Record<string, { present: number; absent: number }> = {};
    att?.forEach((a) => {
      if (!countMap[a.daily_class_id]) countMap[a.daily_class_id] = { present: 0, absent: 0 };
      if (a.status === "present") countMap[a.daily_class_id].present++;
      else countMap[a.daily_class_id].absent++;
    });

    setRows(
      classes.map((c: any) => ({
        date: c.class_date,
        slot: c.time_slots?.label || "",
        className: c.class_name,
        present: countMap[c.id]?.present || 0,
        absent: countMap[c.id]?.absent || 0,
      }))
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 max-w-md">
        <Input
          placeholder="Search by class name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <Button onClick={handleSearch} className="shrink-0">Search</Button>
      </div>

      {rows.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time Slot</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead className="text-center">Present</TableHead>
                  <TableHead className="text-center">Absent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.date}</TableCell>
                    <TableCell>{r.slot}</TableCell>
                    <TableCell>{r.className}</TableCell>
                    <TableCell className="text-center font-medium text-primary">{r.present}</TableCell>
                    <TableCell className="text-center font-medium text-destructive">{r.absent}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {searched && rows.length === 0 && (
        <p className="text-sm text-muted-foreground py-4">No classes found matching "{searchTerm}".</p>
      )}
    </div>
  );
};

/* ── Main Reports Page ──────────────────────────────── */
const Reports = () => {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground">
            View attendance reports and analytics
          </p>
        </div>

        <Tabs defaultValue="date" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
            <TabsTrigger value="date" className="gap-1">
              <Calendar className="w-3.5 h-3.5 hidden sm:block" />
              Date-wise
            </TabsTrigger>
            <TabsTrigger value="employee" className="gap-1">
              <Users className="w-3.5 h-3.5 hidden sm:block" />
              Employee
            </TabsTrigger>
            <TabsTrigger value="slot" className="gap-1">
              <Clock className="w-3.5 h-3.5 hidden sm:block" />
              Time Slot
            </TabsTrigger>
            <TabsTrigger value="class" className="gap-1">
              <BookOpen className="w-3.5 h-3.5 hidden sm:block" />
              Class
            </TabsTrigger>
          </TabsList>

          <TabsContent value="date">
            <DateWiseReport />
          </TabsContent>
          <TabsContent value="employee">
            <EmployeeWiseReport />
          </TabsContent>
          <TabsContent value="slot">
            <SlotWiseReport />
          </TabsContent>
          <TabsContent value="class">
            <ClassWiseReport />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Reports;
