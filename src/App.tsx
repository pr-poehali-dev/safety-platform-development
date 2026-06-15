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
import { AppUser, getUsers, saveUsers } from "@/lib/auth";

const queryClient = new QueryClient();

const SESSION_KEY = "ot_session";
const SESSION_TTL = 60 * 60 * 1000; // 1 час

interface Session {
  user: AppUser;
  loginAt: number;
}

function loadSession(): AppUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session: Session = JSON.parse(raw);
    if (Date.now() - session.loginAt > SESSION_TTL) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session.user;
  } catch (_) { return null; }
}

function saveSession(user: AppUser) {
  const session: Session = { user, loginAt: Date.now() };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

const App = () => {
  const [user, setUser] = useState<AppUser | null>(() => loadSession());
  const [users, setUsers] = useState<AppUser[]>(() => getUsers());

  const handleLogin = (u: AppUser) => {
    saveSession(u);
    setUser(u);
  };

  const handleLogout = () => {
    clearSession();
    setUser(null);
  };

  const handleUsersChange = (updated: AppUser[]) => {
    saveUsers(updated);
    setUsers(updated);
    // обновляем сессию если текущий пользователь изменился
    if (user) {
      const updatedSelf = updated.find(u => u.id === user.id);
      if (updatedSelf) saveSession(updatedSelf);
    }
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
              element={user ? <Navigate to="/" replace /> : <Login users={users} onLogin={handleLogin} />}
            />
            <Route
              path="/"
              element={
                !user ? <Navigate to="/login" replace /> :
                user.role === "admin"
                  ? <Admin currentUser={user} users={users} onUsersChange={handleUsersChange} onLogout={handleLogout} />
                  : <Index user={user} onLogout={handleLogout} />
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
