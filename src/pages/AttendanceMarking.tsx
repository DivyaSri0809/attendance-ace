import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Save, ClipboardCheck, CheckSquare, XSquare, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { sortEmployees } from "@/lib/employeeSort";

type Employee = Tables<"employees">;
type TimeSlot = Tables<"time_slots">;
type DailyClass = Tables<"daily_classes">;

const AttendanceMarking = () => {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [dailyClass, setDailyClass] = useState<DailyClass | null>(null);
  const [className, setClassName] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [presentIds, setPresentIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [loadingAtt, setLoadingAtt] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSlots();
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (date && selectedSlotId) loadClassAndAttendance();
    else {
      setDailyClass(null);
      setPresentIds(new Set());
    }
  }, [date, selectedSlotId]);

  const fetchSlots = async () => {
    const { data } = await supabase
      .from("time_slots")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    setSlots(data || []);
  };

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from("employees")
      .select("*")
      .eq("is_active", true);
    setEmployees(sortEmployees(data || []));
  };

  const loadClassAndAttendance = async () => {
    setLoadingAtt(true);

    // Find daily class
    const { data: classData } = await supabase
      .from("daily_classes")
      .select("*")
      .eq("class_date", date)
      .eq("time_slot_id", selectedSlotId)
      .maybeSingle();

    setDailyClass(classData);
    setClassName(classData?.class_name || "");

    // Load existing attendance
    if (classData) {
      const { data: att } = await supabase
        .from("attendance")
        .select("employee_id, status")
        .eq("daily_class_id", classData.id);
      const present = new Set<string>();
      att?.forEach((a) => {
        if (a.status === "present") present.add(a.employee_id);
      });
      setPresentIds(present);
    } else {
      setPresentIds(new Set());
    }

    setLoadingAtt(false);
  };

  const createClassAndSave = async () => {
    if (!className.trim()) {
      toast({ title: "Error", description: "Please enter a class name", variant: "destructive" });
      return;
    }

    const { data, error } = await supabase
      .from("daily_classes")
      .insert({
        class_date: date,
        time_slot_id: selectedSlotId,
        class_name: className.trim(),
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setDailyClass(data);
    toast({ title: "Created", description: "Class created. Now mark attendance below." });
  };

  const toggleEmployee = (empId: string) => {
    const next = new Set(presentIds);
    if (next.has(empId)) next.delete(empId);
    else next.add(empId);
    setPresentIds(next);
  };

  const markAll = (present: boolean) => {
    if (present) {
      setPresentIds(new Set(employees.map((e) => e.id)));
    } else {
      setPresentIds(new Set());
    }
  };

  const saveAttendance = async () => {
    if (!dailyClass) return;
    setSaving(true);

    const records = employees.map((emp) => ({
      employee_id: emp.id,
      daily_class_id: dailyClass.id,
      status: presentIds.has(emp.id) ? "present" : "absent",
    }));

    const { error } = await supabase
      .from("attendance")
      .upsert(records, { onConflict: "employee_id,daily_class_id" });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Saved",
        description: `Attendance saved: ${presentIds.size} present, ${employees.length - presentIds.size} absent`,
      });
    }
    setSaving(false);
  };

  const selectedSlot = slots.find((s) => s.id === selectedSlotId);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Mark Attendance</h1>
          <p className="text-sm text-muted-foreground">
            Select a date and time slot, then mark attendance
          </p>
        </div>

        {/* Date & Slot Selection */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Time Slot</Label>
                <Select value={selectedSlotId} onValueChange={setSelectedSlotId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time slot" />
                  </SelectTrigger>
                  <SelectContent>
                    {slots.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedSlotId && !loadingAtt && (
          <>
            {/* Class Info */}
            {!dailyClass ? (
              <Card className="border-gold/30 bg-gold/5">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <BookOpen className="w-5 h-5 text-gold mt-0.5" />
                    <div className="flex-1 space-y-3">
                      <p className="text-sm font-medium">
                        No class scheduled for {selectedSlot?.label} on {date}
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                          placeholder="Enter class name"
                          value={className}
                          onChange={(e) => setClassName(e.target.value)}
                          maxLength={100}
                        />
                        <Button onClick={createClassAndSave} className="shrink-0">
                          Create Class
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary" />
                      <span className="font-medium">{dailyClass.class_name}</span>
                      <Badge variant="outline">{selectedSlot?.label}</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => markAll(true)}>
                        <CheckSquare className="w-4 h-4 mr-1" />
                        All Present
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => markAll(false)}>
                        <XSquare className="w-4 h-4 mr-1" />
                        All Absent
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Employee List */}
            {dailyClass && (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  {presentIds.size} / {employees.length} present
                </div>

                <div className="space-y-2">
                  {employees.map((emp) => {
                    const isPresent = presentIds.has(emp.id);
                    return (
                      <Card
                        key={emp.id}
                        className={`cursor-pointer transition-colors ${
                          isPresent
                            ? "border-primary/30 bg-primary/5"
                            : "border-border"
                        }`}
                        onClick={() => toggleEmployee(emp.id)}
                      >
                        <CardContent className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={isPresent}
                              onCheckedChange={() => toggleEmployee(emp.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{emp.employee_id}</p>
                              <p className="text-xs text-muted-foreground">
                                {emp.category}
                                {emp.sub_category ? ` · ${emp.sub_category}` : ""}
                              </p>
                            </div>
                            <Badge
                              variant={isPresent ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {isPresent ? "P" : "A"}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <Button
                  onClick={saveAttendance}
                  disabled={saving}
                  className="w-full sm:w-auto"
                  size="lg"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : "Save Attendance"}
                </Button>
              </div>
            )}
          </>
        )}

        {loadingAtt && (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        )}

        {!selectedSlotId && (
          <div className="text-center py-12 text-muted-foreground">
            <ClipboardCheck className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p>Select a date and time slot to mark attendance</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AttendanceMarking;
