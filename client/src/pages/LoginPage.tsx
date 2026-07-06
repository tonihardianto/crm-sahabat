import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import logoLight from '@/assets/images/logo-256.png';

export function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            navigate('/', { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login gagal');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
            {/* Signature: breathing ambient glow */}
            <div
                className="ambient-glow absolute inset-0 pointer-events-none"
                aria-hidden="true"
                style={{
                    background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(200, 132, 44, 0.12) 0%, transparent 70%)',
                }}
            />

            <div className="relative w-full max-w-sm">
                {/* Brand */}
                <div className="flex flex-col items-center mb-10">
                    <img
                        src={logoLight}
                        alt="AishaCRM"
                        className="w-12 h-12 mb-5 opacity-90"
                    />
                    <h1
                        className="text-4xl tracking-tight text-foreground mb-2"
                        style={{ fontFamily: 'var(--font-display)' }}
                    >
                        AishaCRM
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        SIMRS Sahabat
                    </p>
                </div>

                {/* Login card */}
                <div className="bg-card border border-border/60 rounded-2xl shadow-2xl p-6">
                    <div className="mb-5">
                        <h2 className="text-base font-semibold text-foreground">Selamat datang kembali</h2>
                        <p className="text-xs text-muted-foreground mt-1">Masuk untuk melanjutkan ke dashboard</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                {error}
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label htmlFor="email" className="text-xs font-medium text-foreground/80">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    autoComplete="email"
                                    placeholder="nama@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-9 h-10 text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="password" className="text-xs font-medium text-foreground/80">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type="password"
                                    required
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-9 h-10 text-sm"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-10 mt-2 inline-flex items-center justify-center rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-3.5 h-3.5 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                                    Masuk...
                                </span>
                            ) : (
                                'Masuk'
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center text-[11px] text-muted-foreground mt-6">
                    Hubungi administrator jika lupa password
                </p>
            </div>
        </div>
    );
}
