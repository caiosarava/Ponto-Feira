import { useState, useEffect, useCallback } from "react";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
  permission: PermissionState | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    loading: true,
    error: null,
    permission: null,
  });

  const requestLocation = useCallback(() => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "Geolocalização não é suportada neste dispositivo",
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          loading: false,
          error: null,
          permission: "granted" as PermissionState,
        });
      },
      (err) => {
        let message = "Erro ao obter localização";
        switch (err.code) {
          case err.PERMISSION_DENIED:
            message = "Permissão de localização negada. Habilite o GPS e tente novamente.";
            break;
          case err.POSITION_UNAVAILABLE:
            message = "Posição indisponível. Verifique se o GPS está ativado.";
            break;
          case err.TIMEOUT:
            message = "Tempo esgotado ao obter localização.";
            break;
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          error: message,
          permission: "denied" as PermissionState,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  return { ...state, refresh: requestLocation };
}
