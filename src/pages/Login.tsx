import { useState } from "react";
import Icon from "@/components/ui/icon";
import { AppUser } from "@/lib/auth";

interface LoginProps {
  users: AppUser[];
  onLogin: (user: AppUser) => void;
}

export default function Login({ users, onLogin }: LoginProps) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setTimeout(() => {
      const user = users.find(u => u.login === login.trim() && u.password === password);
      if (user) {
        onLogin(user);
      } else {
        setError("Неверный логин или пароль");
      }
      setLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      {/* Фон */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--border)) 1px, transparent 0)",
          backgroundSize: "32px 32px",
          opacity: 0.4,
        }} />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, hsl(199 89% 48% / 0.06) 0%, transparent 70%)" }} />
      </div>

      <div className="relative w-full max-w-sm animate-fade-in">
        {/* Логотип */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4" style={{ boxShadow: "0 0 24px hsl(199 89% 48% / 0.3)" }}>
            <Icon name="Shield" size={22} className="text-primary-foreground" />
          </div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">SafeWork</h1>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest py-0 px-[1px]">СИСТЕМА УПРАВЛЕНИЯ ОХРАНОЙ ТРУДА И ПРОМЫШЛЕННОЙ БЕЗОПАСНОСТЬЮ</p>
        </div>

        {/* Форма */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-2xl">
          <p className="text-sm font-medium text-foreground mb-5">Вход в систему</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Логин</label>
              <div className="relative">
                <Icon name="User" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={login}
                  onChange={e => { setLogin(e.target.value); setError(""); }}
                  placeholder="Введите логин"
                  autoComplete="username"
                  className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Пароль</label>
              <div className="relative">
                <Icon name="Lock" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(""); }}
                  placeholder="Введите пароль"
                  autoComplete="current-password"
                  className="w-full bg-background border border-border rounded-lg pl-9 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
                />
                <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  <Icon name={showPassword ? "EyeOff" : "Eye"} size={14} />
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                <Icon name="AlertCircle" size={13} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !login || !password}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground text-sm font-medium py-2.5 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
            >
              {loading ? <><Icon name="Loader" size={14} className="animate-spin" />Вход...</> : <><Icon name="LogIn" size={14} />Войти</>}
            </button>
          </form>


        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-6">© 2024 Охрана Труда Онлайн</p>
      </div>
    </div>
  );
}