import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { calculateBiomarkers } from '../lib/circadianEngine';

const DailyChart = ({ settings, location, weather, language, onClose }) => {
  const canvasRef = useRef(null);
  const isRu = language === 'ru';

  // Конфигурация всех линий
  const linesConfig = [
    { key: 'melatonin',     color: 'rgb(167, 139, 250)', labelRu: 'Мелатонин',      labelEn: 'Melatonin' },
    { key: 'cortisol',      color: 'rgb(251, 191, 36)',  labelRu: 'Кортизол',       labelEn: 'Cortisol' },
    { key: 'cognition',     color: 'rgb(96, 165, 250)',  labelRu: 'Фокус',          labelEn: 'Focus' },
    //{ key: 'sleepPressure', color: 'rgb(244, 114, 182)', labelRu: 'Давление сна',   labelEn: 'Sleep pressure' },
  ];

  // Состояние видимости линий
  const [visibleLines, setVisibleLines] = useState(() => {
    const initial = {};
    linesConfig.forEach(line => { initial[line.key] = true; });
    return initial;
  });

  const toggleLine = (key) => {
    setVisibleLines(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const allVisible = Object.values(visibleLines).every(v => v);
  const toggleAll = () => {
    const newState = {};
    linesConfig.forEach(line => { newState[line.key] = !allVisible; });
    setVisibleLines(newState);
  };

  // === РАСЧЁТ ДАННЫХ ЗА 24 ЧАСА (от 12:00 до 12:00) ===
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    const hours = [];
    const data = {
      melatonin: [],
      cortisol: [],
      cognition: [],
      sleepPressure: [],
    };

    const now = new Date();
    
    // Начинаем с 12:00 текущего дня и идём 24 часа
    for (let offset = 0; offset < 24; offset += 0.25) {
      hours.push(offset);
      
      // Вычисляем реальное время (12:00 + offset)
      const realHour = (12 + offset) % 24;
      const time = new Date(now);
      time.setHours(Math.floor(realHour), (realHour % 1) * 60, 0, 0);

      const biomarkers = calculateBiomarkers(time, settings, location, weather, language);

      data.melatonin.push(biomarkers.biomarkers.melatonin);
      data.cortisol.push(biomarkers.biomarkers.cortisol);
      data.cognition.push(biomarkers.biomarkers.cognition);
      data.sleepPressure.push(biomarkers.biomarkers.sleepPressure);
    }

    // Вычисляем позицию "Сейчас" относительно шкалы 12:00-12:00
    const currentHour = now.getHours() + now.getMinutes() / 60;
    const currentPosition = (currentHour - 12 + 24) % 24;

    setChartData({ hours, data, currentPosition });
  }, [settings, location, weather, language]);

  // === РИСОВАНИЕ ===
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !chartData) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    // Фон
    ctx.fillStyle = 'rgba(10, 10, 15, 0.95)';
    ctx.fillRect(0, 0, width, height);

    const padding = { top: 40, right: 20, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Вертикальные линии (часы) - от 12 до 12
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    
    // Метки каждые 3 часа: 12, 15, 18, 21, 0, 3, 6, 9, 12
    for (let offset = 0; offset <= 24; offset += 3) {
      const x = padding.left + (offset / 24) * chartWidth;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, height - padding.bottom);
      ctx.stroke();

      // Вычисляем реальное время для метки
      const realHour = (12 + offset) % 24;
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '11px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${realHour}:00`, x, height - padding.bottom + 20);
    }

    // Горизонтальные линии (0%, 50%, 100%)
    for (let p = 0; p <= 100; p += 25) {
      const y = padding.top + (1 - p / 100) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '10px -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${p}%`, padding.left - 8, y + 3);
    }

    // Рисование линии
    const drawLine = (values, color) => {
      if (values.length < 2) return;

      const points = values.map((value, i) => ({
        x: padding.left + (chartData.hours[i] / 24) * chartWidth,
        y: padding.top + (1 - value) * chartHeight,
      }));

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      ctx.moveTo(points[0].x, points[0].y);
      
      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.stroke();

      // Градиент под линией
      ctx.lineTo(points[points.length - 1].x, padding.top + chartHeight);
      ctx.lineTo(points[0].x, padding.top + chartHeight);
      ctx.closePath();

      const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
      gradient.addColorStop(0, color.replace('rgb', 'rgba').replace(')', ', 0.25)'));
      gradient.addColorStop(1, color.replace('rgb', 'rgba').replace(')', ', 0)'));
      ctx.fillStyle = gradient;
      ctx.fill();
    };

    // Рисуем только включённые линии
    linesConfig.forEach(line => {
      if (visibleLines[line.key]) {
        drawLine(chartData.data[line.key], line.color);
      }
    });

    // Линия "Сейчас"
    const currentX = padding.left + (chartData.currentPosition / 24) * chartWidth;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(currentX, padding.top);
    ctx.lineTo(currentX, height - padding.bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 11px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isRu ? 'Сейчас' : 'Now', currentX, padding.top - 10);

  }, [chartData, visibleLines, language]);

  return (
    <motion.div
      className="chart-modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClose}
    >
      <motion.div
        className="chart-content"
        initial={{ scale: 0.9, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 50 }}
        transition={{ duration: 0.3 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="chart-header">
          <h2>{isRu ? 'Суточная динамика' : 'Daily dynamics'}</h2>
          <button className="chart-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Панель переключателей линий */}
        <div className="chart-toggles">
          <button
            className={`chart-toggle-all ${allVisible ? 'active' : ''}`}
            onClick={toggleAll}
          >
            {allVisible ? (isRu ? '✓ Все' : '✓ All') : (isRu ? '○ Все' : '○ All')}
          </button>

          {linesConfig.map(line => (
            <button
              key={line.key}
              className={`chart-toggle ${visibleLines[line.key] ? 'active' : ''}`}
              style={{
                '--line-color': line.color,
                borderColor: visibleLines[line.key] ? line.color : 'rgba(255, 255, 255, 0.1)',
                background: visibleLines[line.key]
                  ? line.color.replace('rgb', 'rgba').replace(')', ', 0.15)')
                  : 'rgba(255, 255, 255, 0.03)',
              }}
              onClick={() => toggleLine(line.key)}
            >
              <span
                className="toggle-dot"
                style={{
                  background: visibleLines[line.key] ? line.color : 'rgba(255, 255, 255, 0.3)',
                  boxShadow: visibleLines[line.key] ? `0 0 8px ${line.color}` : 'none',
                }}
              />
              {isRu ? line.labelRu : line.labelEn}
            </button>
          ))}
        </div>

        <div className="chart-container">
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: '400px',
              display: 'block',
            }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DailyChart;