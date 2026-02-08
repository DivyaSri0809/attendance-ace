import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Save, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type TimeSlot = Tables<"time_slots">;
type DailyClass = Tables<"daily_classes">;

const DailyClasses = () => {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [classNames, setClassNames] = useState<Record<string, string>>({});
  const [existingClasses, setExistingClasses] = useState<DailyClass[]>([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSlots();
  }, []);

  useEffect(() => {
    if (date) fetchClasses();
  }, [date]);

  const fetchSlots = async () => {
    const { data } = await supabase
      .from("time_slots")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    setSlots(data || []);
  };

  const fetchClasses = async () => {
    const { data } = await supabase
      .from("daily_classes")
      .select("*")
      .eq("class_date", date);

    setExistingClasses(data || []);

    const names: Record<string, string> = {};
    data?.forEach((c) => {
      names[c.time_slot_id] = c.class_name;
    });
    setClassNames(names);
  };

  const handleSave = async () => {
    setSaving(true);
    let hasError = false;

    for (const slot of slots) {
      const name = classNames[slot.id]?.trim();
      if (!name) continue;

      const existing = existingClasses.find((c) => c.time_slot_id === slot.id);

      if (existing) {
        if (existing.class_name !== name) {
          const { error } = await supabase
            .from("daily_classes")
            .update({ class_name: name })
            .eq("id", existing.id);
          if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
            hasError = true;
          }
        }
      } else {
        const { error } = await supabase.from("daily_classes").insert({
          class_date: date,
          time_slot_id: slot.id,
          class_name: name,
        });
        if (error) {
          toast({ title: "Error", description: error.message, variant: "destructive" });
          hasError = true;
        }
      }
    }

    if (!hasError) {
      toast({ title: "Saved", description: "Class schedule saved" });
      fetchClasses();
    }
    setSaving(false);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Daily Class Setup</h1>
          <p className="text-sm text-muted-foreground">
            Assign class names to each time slot for a selected date
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2 max-w-xs">
              <Label>Select Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {slots.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p>No active time slots. Add time slots first.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {slots.map((slot) => (
              <Card key={slot.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    {slot.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    placeholder="Enter class name (e.g., Safety Training)"
                    value={classNames[slot.id] || ""}
                    onChange={(e) =>
                      setClassNames({ ...classNames, [slot.id]: e.target.value })
                    }
                    maxLength={100}
                  />
                </CardContent>
              </Card>
            ))}

            <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Class Schedule"}
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default DailyClasses;
