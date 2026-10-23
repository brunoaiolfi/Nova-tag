import React, {createContext, useContext, PropsWithChildren} from 'react';
import type {AppServices} from '../../appplication/ports/app-services';

const Context = createContext<AppServices | null>(null);

export function AppServicesProvider({
  services,
  children,
}: PropsWithChildren<{services: AppServices}>) {
  return <Context.Provider value={services}>{children}</Context.Provider>;
}

export function useAppServices(): AppServices {
  const services = useContext(Context);
  if (!services)
    throw new Error('AppServicesProvider é necessário para este fluxo.');
  return services;
}
