import * as SunCalc from 'suncalc';

const gaussian = (x, mean, sigma) => {
  return Math.exp(-0.5 * Math.pow((x - mean) / sigma, 2));
};

export const calculateBiomarkers = (date, settings = {}, location = null, weather = null, language = 'ru') => {
  const {
    wakeTime = 7,
    bedTime = 23,
    chronotype = 0,
  } = settings;

  const currentHour = date.getHours() + date.getMinutes() / 60;
  const phaseShift = chronotype * 2;
  const adjustedHour = (currentHour - phaseShift + 24) % 24;

  let sunrise = 6, sunset = 18;
  
  if (location) {
    const times = SunCalc.getTimes(date, location.latitude, location.longitude);
    sunrise = times.sunrise.getHours() + times.sunrise.getMinutes() / 60;
    sunset = times.sunset.getHours() + times.sunset.getMinutes() / 60;
  }

  const hoursAfterSunset = (adjustedHour - sunset + 24) % 24;
  const melatonin = Math.min(1, 
    0.9 * gaussian(adjustedHour, 3.5, 2.5) + 
    0.3 * gaussian(adjustedHour, 22, 2) +
    (hoursAfterSunset < 4 ? hoursAfterSunset * 0.1 : 0)
  );

  const hoursAfterSunrise = (adjustedHour - sunrise + 24) % 24;
  const cortisolPeak = (sunrise + 0.75) % 24;
  const cortisol = Math.min(1,
    0.85 * gaussian(adjustedHour, cortisolPeak, 2) + 
    0.25 * gaussian(adjustedHour, (cortisolPeak + 8) % 24, 3)
  );

  const bodyTemp = 36.6 + 0.5 * Math.sin((adjustedHour - 10) * Math.PI / 12);
  const tempNormalized = (bodyTemp - 36.1) / 1.0;

  const cognition = Math.min(1,
    0.8 * gaussian(adjustedHour, 11, 2) + 
    0.6 * gaussian(adjustedHour, 17, 2) -
    0.3 * gaussian(adjustedHour, 14, 1.5)
  );

  const hoursSinceWake = (currentHour - wakeTime + 24) % 24;
  const sleepPressure = Math.min(1, hoursSinceWake / 16);

  const sympathetic = cortisol * 0.7 + (1 - melatonin) * 0.3;

  let weatherMood = 0;
  if (weather) {
    weatherMood -= weather.cloudCover / 100 * 0.3;
    if (weather.temperature < 10 || weather.temperature > 30) {
      weatherMood -= 0.2;
    }
    if (weather.description.toLowerCase().includes('rain') || 
        weather.description.toLowerCase().includes('дождь') ||
        weather.description.toLowerCase().includes('снег') ||
        weather.description.toLowerCase().includes('snow')) {
      weatherMood -= 0.15;
    }
  }

  let phase, phaseEmoji, phaseColor;
  
  const isAfterSunrise = adjustedHour >= sunrise && adjustedHour < sunrise + 3;
  const isBeforeSunset = adjustedHour >= sunset - 2 && adjustedHour < sunset;
  const isDay = adjustedHour >= sunrise && adjustedHour < sunset;
  const isNight = adjustedHour < sunrise || adjustedHour >= sunset;
  
  if (adjustedHour >= 0 && adjustedHour < 5) {
    phase = language === 'ru' ? "Глубокий сон" : "Deep sleep";
    phaseEmoji = "💤";
    phaseColor = { h: 230, s: 60, l: 10 };
  } else if (isAfterSunrise) {
    phase = language === 'ru' ? "Пробуждение" : "Awakening";
    phaseEmoji = "🌱";
    phaseColor = { h: 300, s: 50, l: 30 };
  } else if (adjustedHour >= 8 && adjustedHour < 12) {
    phase = language === 'ru' ? "Пик фокуса" : "Focus peak";
    phaseEmoji = "🎯";
    phaseColor = { h: 40, s: 85, l: 55 };
  } else if (adjustedHour >= 12 && adjustedHour < 15) {
    phase = language === 'ru' ? "Послеобеденный спад" : "Afternoon slump";
    phaseEmoji = "🍃";
    phaseColor = { h: 25, s: 55, l: 40 };
  } else if (adjustedHour >= 15 && adjustedHour < 19) {
    phase = language === 'ru' ? "Второй пик энергии" : "Second energy peak";
    phaseEmoji = "⚡";
    phaseColor = { h: 20, s: 70, l: 50 };
  } else if (isBeforeSunset) {
    phase = language === 'ru' ? "Вечерний спад" : "Evening slump";
    phaseEmoji = "🕯️";
    phaseColor = { h: 270, s: 45, l: 25 };
  } else if (isNight) {
    phase = language === 'ru' ? "Подготовка ко сну" : "Preparing for sleep";
    phaseEmoji = "📖";
    phaseColor = { h: 240, s: 55, l: 15 };
  } else {
    phase = language === 'ru' ? "Спокойное время" : "Calm time";
    phaseEmoji = "🌿";
    phaseColor = { h: 200, s: 50, l: 40 };
  }

  const recommendation = getRecommendation({
    melatonin, cortisol, cognition, sleepPressure, adjustedHour, 
    wakeTime, bedTime, sunrise, sunset, weather, weatherMood, language
  });

  return {
    currentHour: adjustedHour,
    biomarkers: {
      melatonin,
      cortisol,
      bodyTemp: tempNormalized,
      cognition: Math.max(0, cognition),
      sleepPressure,
      sympathetic,
      weatherMood: Math.max(-1, Math.min(1, weatherMood)),
    },
    phase,
    phaseEmoji,
    phaseColor,
    recommendation,
    rawBodyTemp: bodyTemp.toFixed(1),
    sunTimes: { sunrise, sunset },
  };
};

const getRecommendation = ({ melatonin, cortisol, cognition, sleepPressure, adjustedHour, wakeTime, bedTime, sunrise, sunset, weather, weatherMood, language }) => {
  const isRu = language === 'ru';
  
  if (melatonin > 0.7) return isRu ? "Уровень мелатонина высокий. Приглуши свет и готовься ко сну." : "Melatonin level is high. Dim the lights and prepare for sleep.";
  if (cognition > 0.7 && cortisol > 0.5) return isRu ? "Идеальное время для глубокой работы и концентрации." : "Ideal time for deep work and concentration.";
  if (cognition > 0.5) return isRu ? "Хорошее время для решения сложных задач." : "Good time for solving complex tasks.";
  if (adjustedHour >= 13 && adjustedHour <= 15 && cognition < 0.4) 
    return isRu ? "Послеобеденный спад. Подойдёт лёгкая рутина или короткая прогулка." : "Afternoon slump. Light routine or a short walk would work.";
  if (sleepPressure > 0.8) return isRu ? "Накопилась усталость. Подумай о перерыве или сне." : "Fatigue has accumulated. Think about a break or sleep.";
  if (adjustedHour >= 20) return isRu ? "Вечернее время. Идеально для чтения, медитации, спокойных дел." : "Evening time. Ideal for reading, meditation, calm activities.";
  if (adjustedHour < 6) return isRu ? "Глубокая ночь. Организм восстанавливается." : "Deep night. The body is recovering.";
  
  if (weather && weatherMood < -0.3) {
    if (weather.description.toLowerCase().includes('rain') || weather.description.includes('дождь')) {
      return isRu ? "Дождливая погода. Отличное время для уютных дел дома, чтения или творчества." : "Rainy weather. Great time for cozy activities at home, reading or creativity.";
    }
    if (weather.cloudCover > 80) {
      return isRu ? "Пасмурно. Включи яркий свет для поддержания энергии." : "Cloudy. Turn on bright light to maintain energy.";
    }
  }
  
  if (weather && weatherMood > 0.3 && adjustedHour > sunrise && adjustedHour < sunset - 2) {
    return isRu ? "Хорошая погода! Идеальное время для прогулки на свежем воздухе." : "Good weather! Ideal time for a walk outside.";
  }
  
  return isRu ? "Спокойное время для размеренной деятельности." : "Calm time for measured activities.";
};

export const interpolateColor = (color1, color2, t) => {
  return {
    h: color1.h + (color2.h - color1.h) * t,
    s: color1.s + (color2.s - color1.s) * t,
    l: color1.l + (color2.l - color1.l) * t,
  };
};

export const getBackgroundGradient = (data) => {
  const { phaseColor, biomarkers } = data;
  const { h, s, l } = phaseColor;
  
  const primary = `hsl(${h}, ${s}%, ${l}%)`;
  const secondary = `hsl(${(h + 20) % 360}, ${Math.max(20, s - 10)}%, ${Math.max(3, l - 5)}%)`;
  const accent = biomarkers.melatonin > 0.5 
    ? `hsl(250, 70%, ${15 + biomarkers.melatonin * 10}%)`
    : `hsl(${(h + 40) % 360}, ${s}%, ${l + 10}%)`;
  
  return { primary, secondary, accent };
};