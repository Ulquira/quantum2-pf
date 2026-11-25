// Etiqueta: Pantalla de acceso vanguardista split-screen con identidad oficial PeruFibra
import React, { useState } from 'react';
import { Lock, User, Loader2, ArrowRight, ShieldCheck, Radio } from 'lucide-react';
import { PeruFibraLogo } from '../../../components/brand/PeruFibraLogo';
import type { SesionUsuario } from '../types/auth.types';
import { apiClient } from '../../../lib/apiClient';

interface Props {
  onLoginSuccess: (usuario: SesionUsuario) => void;
}

export const LoginView: React.FC<Props> = ({ onLoginSuccess }) => {
  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const iniciarSesion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      const { data } = await apiClient.post<SesionUsuario>('/auth/login', { dni, password });
      onLoginSuccess(data);
    } catch (err) {
      setError((err as Error).message || 'Credenciales inválidas');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F7F9] grid lg:grid-cols-12">
      {/* Panel editorial izquierdo (desktop) */}
      <div className="hidden lg:flex lg:col-span-7 relative overflow-hidden bg-[#0F1117] text-white p-12 flex-col justify-between">
        {/* Resplandores sutiles de marca (Rojo + Amarillo PeruFibra) */}
        <div
          className="pointer-events-none absolute -top-24 -left-24 w-[460px] h-[460px] rounded-full opacity-35 blur-3xl"
          style={{ background: 'radial-gradient(circle, #D80319 0%, transparent 70%)' }}
        />
        <div
          className="pointer-events-none absolute -bottom-32 right-0 w-[420px] h-[420px] rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #F4BA00 0%, transparent 70%)' }}
        />

        {/* Grid arquitectonico sutil */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative z-10 flex items-center justify-between">
          <PeruFibraLogo variant="on-red" className="h-9" />
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-[11px] font-semibold text-neutral-300">
            <Radio className="w-3.5 h-3.5 text-pf-yellow" />
            Quantum Operaciones
          </span>
        </div>

        <div className="relative z-10 max-w-lg space-y-5">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-pf-yellow tracking-wide uppercase">
            <span className="w-6 h-[2px] bg-pf-yellow rounded-full" />
            Plataforma FTTH Integral
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight leading-[1.12] text-white">
            Control operativo de instalaciones en tiempo real.
          </h1>
          <p className="text-sm text-neutral-400 leading-relaxed">
            Centralizá programación, despacho de cuadrillas, trazabilidad de CTOs y evidencias de campo desde un solo entorno rápido y confiable.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-6 text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-pf-red" />
            <span>Acceso unificado Web &amp; APK</span>
          </div>
          <span className="text-neutral-700">•</span>
          <span>PerúFibra Telecom</span>
        </div>
      </div>

      {/* Panel de formulario derecho */}
      <div className="lg:col-span-5 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[390px] pf-fade-in">
          <div className="lg:hidden mb-8 flex justify-center">
            <PeruFibraLogo variant="on-white" className="h-9" />
          </div>

          <div className="pf-card p-8 space-y-6">
            <div className="space-y-1.5">
              <h2 className="text-2xl font-bold text-slate-900">Iniciar sesión</h2>
              <p className="text-xs text-slate-500">
                Ingresá con tu DNI y contraseña asignada para continuar.
              </p>
            </div>

            <form onSubmit={iniciarSesion} className="space-y-4">
              {error && (
                <div className="bg-pf-red/8 border border-pf-red/20 text-pf-red text-xs font-semibold px-3.5 py-2.5 rounded-xl">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">DNI / Usuario</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    autoFocus
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    placeholder="Ej: 71234567"
                    className="pf-input w-full pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Contraseña</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pf-input w-full pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={cargando}
                className="pf-btn-primary w-full font-semibold text-sm py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {cargando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verificando...</span>
                  </>
                ) : (
                  <>
                    <span>Ingresar al panel</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
