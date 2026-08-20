import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CircadianCanvas from './components/CircadianCanvas';
import { calculateBiomarkers, getBackgroundGradient } from './lib/circadianEngine';
import { useGeolocation } from './hooks/useGeolocation';
import { useWeather } from './hooks/useWeather';
import { useLanguage } from './hooks/useLanguage';
import './App.css';

function App() {
  const [data, setData] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('circadian-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          wakeTime: parsed.wakeTime ?? 7,
          bedTime: parsed.bedTime ?? 23,
          chronotype: parsed.chronotype ?? 0,
        };
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    }
    return { wakeTime: 7, bedTime: 23, chronotype: 0 };
  });

  const { location, error: locationError, loading: locationLoading, requestLocation } = useGeolocation();
  const { weather, loading: weatherLoading, error: weatherError } = useWeather(
    location?.latitude,
    location?.longitude
  );
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    try {
      localStorage.setItem('circadian-settings', JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  }, [settings]);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(now);
      setData(calculateBiomarkers(now, settings, location, weather, language));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [settings, location, weather, language]);

  if (!data) return null;

  const gradient = getBackgroundGradient(data);
  const timeStr = currentTime.toLocaleTimeString(language === 'ru' ? 'ru-RU' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
  const dateStr = currentTime.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  return (
    <div
      className="app"
      style={{
        background: `linear-gradient(180deg, ${gradient.primary} 0%, ${gradient.secondary} 100%)`,
        transition: 'background 2s ease',
      }}
    >
      <CircadianCanvas data={data} />

      <div className="content">
        <motion.div 
          className="time-block"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="date">{dateStr}</div>
          <div className="time">{timeStr}</div>
        </motion.div>

{/* Погода */}
{weather && (
   <motion.div 
    className="weather-block"
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.6 }}
   >
     <div className="weather-icon">{weather.icon}</div>
     <div className="weather-info">
       <div className="weather-temp">{weather.temperature}°C</div>
      {/*  <div className="weather-desc">{weather.description}</div>*/}
     </div>
   </motion.div>
)}

        {weatherError && (
          <div className="error-message">
            ⚠️ {t('weatherUnavailable')}: {weatherError}
          </div>
        )}

        <motion.div 
          className="phase-block"
          key={data.phase}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="phase-name">{data.phase}</div>
          <div className="phase-emoji">{data.phaseEmoji}</div>
        </motion.div>

        <motion.div 
          className="recommendation"
          key={data.recommendation}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {data.recommendation}
        </motion.div>

        <motion.div 
          className="biomarkers"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <BiomarkerBar label={t('melatonin')} value={data.biomarkers.melatonin} color="#a78bfa" />
          <BiomarkerBar label={t('cortisol')} value={data.biomarkers.cortisol} color="#fbbf24" />
          <BiomarkerBar label={t('focus')} value={data.biomarkers.cognition} color="#60a5fa" />
          <BiomarkerBar label={t('sleepPressure')} value={data.biomarkers.sleepPressure} color="#f472b6" />
        </motion.div>

        <div className="buttons-row">
          <button 
            className="settings-btn"
            onClick={() => setShowSettings(!showSettings)}
            aria-label={t('settings')}
          >
            ⚙️
          </button>
          
          <button
            className="language-btn"
            onClick={() => setLanguage(language === 'ru' ? 'en' : 'ru')}
            title={t('language')}
          >
            {language === 'ru' ? 'RU' : 'EN'}
          </button>

          <button
            className="location-btn"
            onClick={requestLocation}
            disabled={locationLoading}
            title={location?.isFallback ? t('usingApproximate') : t('updateLocation')}
          >
            {locationLoading ? '⏳' : location?.isFallback ? '📍' : '🔄'}
          </button>
        </div>

        {locationError && location?.isFallback && (
          <div className="location-warning">
            📍 {t('locationWarning')}
          </div>
        )}

        <AnimatePresence>
          {showSettings && (
            <motion.div 
              className="settings-panel"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ duration: 0.3 }}
            >
              <h3>{t('settings')}</h3>
              
              <div className="setting-row">
                <label>{t('wakeTime')}: {settings.wakeTime}:00</label>
                <input
                  type="range"
                  min="4"
                  max="11"
                  step="0.5"
                  value={settings.wakeTime}
                  onChange={(e) => setSettings({ ...settings, wakeTime: parseFloat(e.target.value) })}
                />
              </div>

              <div className="setting-row">
                <label>{t('bedtime')}: {settings.bedTime}:00</label>
                <input
                  type="range"
                  min="20"
                  max="26"
                  step="0.5"
                  value={settings.bedTime}
                  onChange={(e) => setSettings({ ...settings, bedTime: parseFloat(e.target.value) })}
                />
              </div>

              <div className="setting-row">
                <label>{t('chronotype')}</label>
                <div className="chronotype-buttons">
                  <button
                    className={settings.chronotype === -1 ? 'active' : ''}
                    onClick={() => setSettings({ ...settings, chronotype: -1 })}
                  >
                    🌅 {t('lark')}
                  </button>
                  <button
                    className={settings.chronotype === 0 ? 'active' : ''}
                    onClick={() => setSettings({ ...settings, chronotype: 0 })}
                  >
                    ☀️ {t('normal')}
                  </button>
                  <button
                    className={settings.chronotype === 1 ? 'active' : ''}
                    onClick={() => setSettings({ ...settings, chronotype: 1 })}
                  >
                    🌙 {t('owl')}
                  </button>
                </div>
              </div>

              <div className="setting-row">
                <label>{t('language')}</label>
                <div className="language-buttons">
                  <button
                    className={language === 'ru' ? 'active' : ''}
                    onClick={() => setLanguage('ru')}
                  >
                    RU {t('russian')}
                  </button>
                  <button
                    className={language === 'en' ? 'active' : ''}
                    onClick={() => setLanguage('en')}
                  >
                    EN {t('english')}
                  </button>
                </div>
              </div>

              {location && (
                <div className="location-info">
                  <p>📍 {t('location')}: {location.latitude.toFixed(2)}°, {location.longitude.toFixed(2)}°
                    {location.isFallback && ` (${t('approximate')})`}
                  </p>
                  <p>🌅 {t('sunrise')}: {Math.floor(data.sunTimes.sunrise)}:{String(Math.round((data.sunTimes.sunrise % 1) * 60)).padStart(2, '0')}</p>
                  <p>🌇 {t('sunset')}: {Math.floor(data.sunTimes.sunset)}:{String(Math.round((data.sunTimes.sunset % 1) * 60)).padStart(2, '0')}</p>
                </div>
              )}

              <button 
                className="close-btn"
                onClick={() => setShowSettings(false)}
              >
                {t('close')}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

const BiomarkerBar = ({ label, value, color }) => (
  <div className="biomarker">
    <div className="biomarker-label">
      <span>{label}</span>
      <span>{Math.round(value * 100)}%</span>
    </div>
    <div className="biomarker-bar">
      <motion.div
        className="biomarker-fill"
        style={{ background: color }}
        animate={{ width: `${value * 100}%` }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
    </div>
  </div>
);

export default App;