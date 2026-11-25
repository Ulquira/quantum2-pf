// Etiqueta: Enrutador raiz por sesion y Rol con react-router-dom (TECNICO -> APK | Resto -> Web)
import React, { useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { ClientesView } from './features/clientes/components/ClientesView';
import { OperacionesView } from './features/operaciones/components/OperacionesView';
import { UsuariosView } from './features/usuarios/components/UsuariosView';
import { ConfiguracionView } from './features/configuracion/components/ConfiguracionView';
import { LoginView } from './features/auth/components/LoginView';
import { TecnicoApkView } from './features/tecnico-apk/components/TecnicoApkView';
import type { SesionUsuario } from './features/auth/types/auth.types';
import { queryClient } from './lib/queryClient';

const STORAGE_KEY = 'pf_sesion_activa';

export const App: React.FC = () => {
  const navigate = useNavigate();
  const [sesion, setSesion] = useState<SesionUsuario | null>(() => {
    try {
      const guardado = localStorage.getItem(STORAGE_KEY);
      return guardado ? (JSON.parse(guardado) as SesionUsuario) : null;
    } catch {
      return null;
    }
  });

  const manejarLogin = (user: SesionUsuario) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    setSesion(user);
    if (user.rol === 'TECNICO') navigate('/apk', { replace: true });
    else if (user.rol === 'PARTNER') navigate('/operaciones', { replace: true });
    else navigate('/clientes', { replace: true });
  };

  const cerrarSesion = () => {
    localStorage.removeItem(STORAGE_KEY);
    queryClient.clear();
    setSesion(null);
    navigate('/', { replace: true });
  };

  if (!sesion) {
    return <LoginView onLoginSuccess={manejarLogin} />;
  }

  if (sesion.rol === 'TECNICO') {
    return <TecnicoApkView usuario={sesion} onLogout={cerrarSesion} />;
  }

  const rutaPorDefecto = sesion.rol === 'PARTNER' ? '/operaciones' : '/clientes';

  return (
    <div className="flex min-h-screen bg-[#F6F7F9] text-slate-900">
      <Sidebar usuario={sesion} onLogout={cerrarSesion} />

      <main className="flex-1 min-w-0 max-w-[1680px]">
        <Routes>
          <Route
            path="/clientes"
            element={<ClientesView onOrdenProgramada={() => navigate('/operaciones')} />}
          />
          <Route path="/operaciones" element={<OperacionesView />} />
          <Route path="/usuarios" element={<UsuariosView />} />
          <Route path="/configuracion" element={<ConfiguracionView />} />
          <Route path="*" element={<Navigate to={rutaPorDefecto} replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
