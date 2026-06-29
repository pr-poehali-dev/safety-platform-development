import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import { AppUser, fetchUsers, loadSession, saveSession, clearSession } from "@/lib/auth";

const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = useState<AppUser | null>(() => loadSession());
  const [users, setUsers] = useState<AppUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  useEffect(() => {
    fetchUsers()
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setUsersLoading(false));
  }, []);

  const handleLogin = (u: AppUser) => {
    saveSession(u);
    setUser(u);
  };

  const handleLogout = () => {
    clearSession();
    setUser(null);
  };

  const handleUsersChange = (updated: AppUser[]) => {
    setUsers(updated);
    if (user) {
      const updatedSelf = updated.find(u => u.id === user.id);
      if (updatedSelf) {
        saveSession(updatedSelf);
        setUser(updatedSelf);
      }
    }
  };

  if (usersLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route
              path="/login"
              element={user ? <Navigate to="/" replace /> : <Login users={users} onLogin={handleLogin} />}
            />
            <Route
              path="/"
              element={
                !user ? <Navigate to="/login" replace /> :
                user.role === "admin"
                  ? <Admin currentUser={user} users={users} onUsersChange={handleUsersChange} onLogout={handleLogout} />
                  : <Index user={user} onLogout={handleLogout} onUserUpdate={u => { saveSession(u); setUser(u); }} />
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;