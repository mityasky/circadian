import { useState, useEffect } from 'react';

export const useGeolocation = () => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fallback координаты (Москва) если геолокация недоступна
  const fallbackLocation = {
    latitude: 55.7558,
    longitude: 37.6176,
    isFallback: true,
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError('Геолокация не поддерживается браузером');
      setLocation(fallbackLocation);
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          isFallback: false,
        };
        setLocation(loc);
        setLoading(false);
        
        localStorage.setItem('circadian-location', JSON.stringify(loc));
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        setError(err.message);
        setLoading(false);
        
        // Используем fallback если пользователь отказал или ошибка
        setLocation(fallbackLocation);
        localStorage.setItem('circadian-location', JSON.stringify(fallbackLocation));
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  };

  // Автоматически запрашиваем геолокацию при первом монтировании
  useEffect(() => {
    const saved = localStorage.getItem('circadian-location');
    if (saved) {
      try {
        setLocation(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load location', e);
        requestLocation();
      }
    } else {
      // Если нет сохранённой локации — запрашиваем
      requestLocation();
    }
  }, []);

  return { location, error, loading, requestLocation };
};