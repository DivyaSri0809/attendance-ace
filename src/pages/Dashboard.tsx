import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users, Clock, BookOpen, ClipboardCheck, FileText, ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeSlots: 0,
    todayClasses: 0,
    attendancePercent: "N/A" as string | number,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const today = new Date().toISOString().split("T")[0];

      const [empRes, slotRes, classRes] = await Promise.all([
        supabase.from("employees").select("id", { count: "exact" }).eq("is_active", true),
        supabase.from("time_slots").select("id", { count: "exact" }).eq("is_active", true),
        supabase.from("daily_classes").select("id").eq("class_date", today),
      ]);

      let attendancePercent: string | number = "N/A";
      if (classRes.data && classRes.data.length > 0) {
        const ids = classRes.data.map((c) => c.id);
        const { data: att } = await supabase
          .from("attendance")
          .select("status")
          .in("daily_class_id", ids);
        if (att && att.length > 0) {
          const present = att.filter((a) => a.status === "present").length;
          attendancePercent = `${Math.round((present / att.length) * 100)}%`;
        }
      }

      setStats({
        totalEmployees: empRes.count || 0,
        activeSlots: slotRes.count || 0,
        todayClasses: classRes.data?.length || 0,
        attendancePercent,
      });
    };
    fetchStats();
  }, []);

  const statCards = [
    { title: "Total Employees", value: stats.totalEmployees, icon: Users, iconClass: "text-primary" },
    { title: "Active Time Slots", value: stats.activeSlots, icon: Clock, iconClass: "text-gold" },
    { title: "Today's Classes", value: stats.todayClasses, icon: BookOpen, iconClass: "text-primary" },
    { title: "Today's Attendance", value: stats.attendancePercent, icon: ClipboardCheck, iconClass: "text-gold" },
  ];

  const quickActions = [
    { label: "Mark Attendance", to: "/attendance", icon: ClipboardCheck },
    { label: "Manage Employees", to: "/employees", icon: Users },
    { label: "Setup Classes", to: "/daily-classes", icon: BookOpen },
    { label: "View Reports", to: "/reports", icon: FileText },
  ];

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Welcome back, Admin · {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <Card key={s.title}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{s.title}</p>
                    <p className="text-2xl md:text-3xl font-bold mt-1">{s.value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center ${s.iconClass}`}>
                    <s.icon className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {quickActions.map((a) => (
              <Link key={a.to} to={a.to}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                  <CardContent className="py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <a.icon className="w-5 h-5 text-primary" />
                      <span className="font-medium text-sm">{a.label}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
