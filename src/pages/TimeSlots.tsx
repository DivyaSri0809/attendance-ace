import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type TimeSlot = Tables<"time_slots">;

const TimeSlots = () => {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTime, setNewTime] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchSlots();
  }, []);

  const fetchSlots = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("time_slots")
      .select("*")
      .order("sort_order");
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSlots(data || []);
    }
    setLoading(false);
  };

  const toggleActive = async (slot: TimeSlot) => {
    const { error } = await supabase
      .from("time_slots")
      .update({ is_active: !slot.is_active })
      .eq("id", slot.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      fetchSlots();
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTime || !newLabel.trim()) return;

    const maxOrder = Math.max(0, ...slots.map((s) => s.sort_order));
    const { error } = await supabase.from("time_slots").insert({
      time: newTime,
      label: newLabel.trim(),
      sort_order: maxOrder + 1,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Added", description: "Time slot added" });
      setDialogOpen(false);
      setNewTime("");
      setNewLabel("");
      fetchSlots();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this time slot? This will also delete associated classes and attendance.")) return;
    const { error } = await supabase.from("time_slots").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: "Time slot deleted" });
      fetchSlots();
    }
  };

  const formatTime = (time: string) => {
    const [h, m] = time.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12 = hour % 12 || 12;
    return `${String(h12).padStart(2, "0")}:${m} ${ampm}`;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Time Slots</h1>
            <p className="text-sm text-muted-foreground">
              Manage class schedule time slots
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Slot
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Time Slot</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={newTime}
                    onChange={(e) => {
                      setNewTime(e.target.value);
                      if (e.target.value) setNewLabel(formatTime(e.target.value));
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Label</Label>
                  <Input
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="e.g. 08:00 AM"
                    required
                    maxLength={20}
                  />
                </div>
                <Button type="submit" className="w-full">Add Time Slot</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {slots.map((slot) => (
            <Card
              key={slot.id}
              className={`transition-opacity ${!slot.is_active ? "opacity-50" : ""}`}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{slot.label}</p>
                      <p className="text-xs text-muted-foreground">{slot.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={slot.is_active}
                      onCheckedChange={() => toggleActive(slot)}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(slot.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {slots.length === 0 && !loading && (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p>No time slots configured</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default TimeSlots;
