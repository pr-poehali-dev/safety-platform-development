import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import { AppUser, INITIAL_USERS } from "@/lib/auth";

const queryClient = new QueryClient();

const STORAGE_KEY = "ot_users";

function loadUsers(): AppUser[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved) as AppUser[];
  } catch (_) { /* ignore */ }
  return INITIAL_USERS;
}

function saveUsers(users: AppUser[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

const App = () => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [users, setUsers] = useState<AppUser[]>(loadUsers);

  const handleUsersChange = (updated: AppUser[]) => {
    saveUsers(updated);
    setUsers(updated);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route
              path="/login"
              element={user ? <Navigate to="/" replace /> : <Login users={users} onLogin={setUser} />}
            />
            <Route
              path="/"
              element={
                !user ? <Navigate to="/login" replace /> :
                user.role === "admin"
                  ? <Admin currentUser={user} users={users} onUsersChange={handleUsersChange} onLogout={() => setUser(null)} />
                  : <Index user={user} onLogout={() => setUser(null)} />
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