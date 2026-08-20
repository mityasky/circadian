import { useState, useEffect } from 'react';

export const useWeather = (latitude, longitude) => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!latitude || !longitude) {
      setWeather(null);
      return;
    }

    const fetchWeather = async () => {
      setLoading(true);
      setError(null);

      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,cloud_cover,wind_speed_10m&timezone=auto`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error('Failed to fetch weather');
        }

        const data = await response.json();
        const weatherInfo = interpretWeatherCode(data.current.weather_code);
        
        setWeather({
          temperature: Math.round(data.current.temperature_2m),
          feelsLike: Math.round(data.current.apparent_temperature),
          humidity: data.current.relative_humidity_2m,
          cloudCover: data.current.cloud_cover,
          windSpeed: data.current.wind_speed_10m,
          description: weatherInfo.description,
          icon: weatherInfo.icon,
          isDay: weatherInfo.isDay,
        });
      } catch (err) {
        setError(err.message);
        console.error('Weather fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [latitude, longitude]);

  return { weather, loading, error };
};

const interpretWeatherCode = (code) => {
  const hour = new Date().getHours();
  const isDay = hour >= 6 && hour < 20;
  
  const codes = {
    0: { description: 'Ясно', icon: isDay ? '☀️' : '🌙' },
    1: { description: 'Преимущественно ясно', icon: isDay ? '🌤️' : '🌙' },
    2: { description: 'Переменная облачность', icon: isDay ? '⛅' : '☁️' },
    3: { description: 'Пасмурно', icon: '☁️' },
    45: { description: 'Туман', icon: '🌫️' },
    48: { description: 'Изморозь', icon: '🌫️' },
    51: { description: 'Лёгкая морось', icon: '🌦️' },
    53: { description: 'Морось', icon: '🌦️' },
    55: { description: 'Сильная морось', icon: '🌧️' },
    61: { description: 'Слабый дождь', icon: '🌦️' },
    63: { description: 'Дождь', icon: '🌧️' },
    65: { description: 'Сильный дождь', icon: '🌧️' },
    71: { description: 'Слабый снег', icon: '🌨️' },
    73: { description: 'Снег', icon: '❄️' },
    75: { description: 'Сильный снег', icon: '❄️' },
    77: { description: 'Снежные зёрна', icon: '🌨️' },
    80: { description: 'Ливень', icon: '🌦️' },
    81: { description: 'Сильный ливень', icon: '🌧️' },
    82: { description: 'Очень сильный ливень', icon: '⛈️' },
    85: { description: 'Снегопад', icon: '🌨️' },
    86: { description: 'Сильный снегопад', icon: '❄️' },
    95: { description: 'Гроза', icon: '⛈️' },
    96: { description: 'Гроза с градом', icon: '⛈️' },
    99: { description: 'Сильная гроза с градом', icon: '⛈️' },
  };

  const info = codes[code] || { description: 'Неизвестно', icon: '❓' };
  return { ...info, isDay };
};