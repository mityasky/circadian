import { useEffect, useRef } from 'react';

/**
 * Компонент анимированной волны на Canvas
 * Рисует суперпозицию синусоид, привязанных к биомаркерам
 */
const CircadianCanvas = ({ data }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width, height;

    // Установка размеров canvas с учётом DPR для чёткости
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    // Рисование одного кадра
    const draw = () => {
      if (!data) return;

      timeRef.current += 0.008;
      const t = timeRef.current;

      const { biomarkers, phaseColor } = data;
      const { melatonin, cortisol, cognition, sleepPressure } = biomarkers;

      // Очистка canvas
      ctx.clearRect(0, 0, width, height);

      // === ФОНОВАЯ ДЫМКА ===
      const bgGrad = ctx.createRadialGradient(
        width * 0.5, height * 0.6, 0,
        width * 0.5, height * 0.6, Math.max(width, height) * 0.8
      );
      const h = phaseColor.h;
      const s = phaseColor.s;
      const l = phaseColor.l;
      
      bgGrad.addColorStop(0, `hsla(${h}, ${s}%, ${Math.min(100, l + 15)}%, 0.4)`);
      bgGrad.addColorStop(0.5, `hsla(${h}, ${s}%, ${l}%, 0.2)`);
      bgGrad.addColorStop(1, `hsla(${h}, ${s}%, ${Math.max(0, l - 5)}%, 0)`);
      
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // === ВОЛНЫ ===
      // Рисуем 3 слоя волн с разной амплитудой и скоростью
      const waves = [
        {
          // Волна мелатонина - медленная, широкая
          amplitude: 30 + melatonin * 50,
          frequency: 0.008,
          speed: 0.3,
          phase: melatonin * Math.PI * 2,
          color: `hsla(${(h + 180) % 360}, 70%, 60%, ${0.15 + melatonin * 0.2})`,
          yOffset: height * 0.55,
        },
        {
          // Волна кортизола - быстрая, острая
          amplitude: 20 + cortisol * 40,
          frequency: 0.015,
          speed: 0.7,
          phase: cortisol * Math.PI,
          color: `hsla(${(h + 40) % 360}, 80%, 65%, ${0.2 + cortisol * 0.2})`,
          yOffset: height * 0.6,
        },
        {
          // Волна когнитивки - средняя
          amplitude: 15 + cognition * 35,
          frequency: 0.012,
          speed: 0.5,
          phase: cognition * Math.PI * 1.5,
          color: `hsla(${h}, 75%, 60%, ${0.25 + cognition * 0.2})`,
          yOffset: height * 0.65,
        },
      ];

      waves.forEach((wave) => {
        drawWave(ctx, wave, t, width, height);
      });

      // === ЧАСТИЦЫ (звёзды/искры) ===
      drawParticles(ctx, t, width, height, data);

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'block',
      }}
    />
  );
};

/**
 * Рисование одной волны
 */
const drawWave = (ctx, wave, time, width, height) => {
  ctx.beginPath();
  ctx.moveTo(0, height);

  const steps = Math.ceil(width / 3); // шаг в 3px для производительности
  
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * width;
    // Суперпозиция синусоид для органичности
    const y = wave.yOffset +
      Math.sin(x * wave.frequency + time * wave.speed + wave.phase) * wave.amplitude +
      Math.sin(x * wave.frequency * 2.3 + time * wave.speed * 1.3) * wave.amplitude * 0.3 +
      Math.sin(x * wave.frequency * 0.5 + time * wave.speed * 0.7) * wave.amplitude * 0.5;
    
    if (i === 0) {
      ctx.lineTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.lineTo(width, height);
  ctx.closePath();

  // Градиент волны
  const gradient = ctx.createLinearGradient(0, wave.yOffset - wave.amplitude, 0, height);
  gradient.addColorStop(0, wave.color);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  
  ctx.fillStyle = gradient;
  ctx.fill();
};

/**
 * Рисование частиц (звёзды ночью, искры днём)
 */
const drawParticles = (ctx, time, width, height, data) => {
  const { biomarkers, phaseColor } = data;
  const { melatonin } = biomarkers;
  
  // Количество частиц зависит от фазы
  const particleCount = Math.floor(30 + melatonin * 40);
  
  for (let i = 0; i < particleCount; i++) {
    // Псевдослучайные, но стабильные позиции (на основе индекса)
    const seed = i * 9301 + 49297;
    const rx = (seed % 233280) / 233280;
    const ry = ((seed * 7) % 233280) / 233280;
    
    const x = rx * width;
    const y = ry * height * 0.7;
    
    // Мерцание
    const twinkle = Math.sin(time * 2 + i * 0.5) * 0.5 + 0.5;
    const size = (0.5 + twinkle * 1.5) * (melatonin > 0.5 ? 1.5 : 0.8);
    const alpha = (0.2 + twinkle * 0.6) * (melatonin > 0.3 ? 0.8 : 0.3);
    
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${phaseColor.h + 30}, 80%, 85%, ${alpha})`;
    ctx.fill();
  }
};

export default CircadianCanvas;