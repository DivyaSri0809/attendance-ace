import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Users, Clock, BookOpen, ClipboardCheck,
  FileText, LogOut, Menu, Shield,
} from "lucide-react";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/employees", label: "Employees", icon: Users },
  { path: "/time-slots", label: "Time Slots", icon: Clock },
  { path: "/daily-classes", label: "Daily Classes", icon: BookOpen },
  { path: "/attendance", label: "Attendance", icon: ClipboardCheck },
  { path: "/reports", label: "Reports", icon: FileText },
];

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sidebar-primary rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-sidebar-foreground text-sm">Attendance</h1>
            <p className="text-[11px] text-sidebar-foreground/60">Management System</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className="w-[18px] h-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={() => {
            logout();
            setOpen(false);
          }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-sidebar-foreground/70 hover:bg-destructive/20 hover:text-destructive transition-colors text-sm font-medium"
        >
          <LogOut className="w-[18px] h-[18px]" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-60 bg-sidebar flex-col fixed h-full z-30">
        <NavContent />
      </aside>

     {/* Mobile Header */}
<div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-sidebar border-b border-sidebar-border">
  <div className="flex items-center justify-between px-4 py-3">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
        <Shield className="w-4 h-4 text-sidebar-primary-foreground" />
      </div>
      <span className="font-bold text-sidebar-foreground text-sm">
        Attendance System
      </span>
    </div>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-60">
        <NavContent />
      </SheetContent>
    </Sheet>
  </div>
</div>

      {/* Main Content */}
     <main className="flex-1 lg:ml-60 pt-14 lg:pt-0">


        <div className="p-4 md:p-6 lg:p-8 max-w-7xl">{children}</div>
      </main>
    </div>
  );
};

export default AppLayout;
