import { createWidget, widget, align, prop, text_style } from '@zos/ui'
import { Battery, Calorie, Distance, Sleep, Step, Time, Weather } from '@zos/sensor'
import { getTemperatureUnit, TEMPERATURE_UNIT_FAHRENHEIT } from '@zos/settings'

const WEEKDAYS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM']
const FONT = 'fonts/Audiowide-Regular.ttf'
const DIGITAL_FONT = 'fonts/DS-DIGIB.TTF'
const TIME_DIGIT_SLOTS = [35, 100, 213, 278]

// Cada medidor e uma tira "tudo aceso" recortada pela largura do widget: a arte
// de fundo tem os mesmos tracinhos apagados embaixo. count/pitch/tick descrevem
// a fileira medida na arte e sao gerados junto com os PNGs por
// tools/build-gauge-assets.js.
const GAUGES = {
  steps: { x: 138, y: 338, w: 102, h: 6, src: 'gauge-steps.png', count: 18, pitch: 5.94, tick: 4 },
  calories: { x: 138, y: 403, w: 102, h: 7, src: 'gauge-calories.png', count: 18, pitch: 5.77, tick: 4 },
  distance: { x: 256, y: 338, w: 94, h: 6, src: 'gauge-distance.png', count: 18, pitch: 5.47, tick: 4 },
  sleep: { x: 258, y: 403, w: 107, h: 6, src: 'gauge-sleep.png', count: 18, pitch: 5.82, tick: 4 },
  battery: { x: 41, y: 85, w: 35, h: 13, src: 'gauge-battery.png', count: 4, pitch: 9.33, tick: 7 },
}

// Onde a lua ficava cravada na arte. O fundo agora chega vazio nessa area e o
// icone entra por cima conforme a condicao sincronizada.
const WEATHER_ICON = { x: 317, y: 78, w: 37, h: 39 }

// Indices de condicao do Zepp OS (0 a 28) agrupados nos icones disponiveis. O 25
// e "Unknown" e fica de fora de proposito: sem condicao conhecida nenhum icone
// aparece, em vez de mostrar um tempo que nao foi informado.
const WEATHER_ICONS = {
  0: 'cloudy', 4: 'cloudy', 26: 'cloudy-night',
  1: 'rain', 5: 'rain', 7: 'rain', 12: 'rain', 19: 'rain', 27: 'rain',
  10: 'rain-heavy', 18: 'rain-heavy', 21: 'rain-heavy', 24: 'rain-heavy',
  2: 'snow', 6: 'snow', 8: 'snow', 9: 'snow', 16: 'snow',
  11: 'fog', 13: 'fog', 14: 'fog', 17: 'fog', 22: 'fog', 23: 'fog',
  15: 'storm', 20: 'storm',
  3: 'clear', 28: 'clear-night',
}

// Sem meta na API: distancia e sono usam alvos fixos. Passos e calorias leem a
// meta do proprio relogio e so caem nestes valores se a leitura falhar.
const DISTANCE_GOAL_METERS = 5000
const SLEEP_GOAL_MINUTES = 480
const STEPS_GOAL_FALLBACK = 8000
const CALORIES_GOAL_FALLBACK = 300

function readValue(reader, fallback) {
  try {
    return reader()
  } catch (error) {
    return fallback
  }
}

function readNumber(reader, fallback) {
  const value = readValue(reader, fallback)
  return Number.isFinite(value) ? value : fallback
}

function pad2(value) {
  return `${value < 10 ? '0' : ''}${value}`
}

function formatDistance(meters) {
  if (!Number.isFinite(meters) || meters < 0) return '--,--'
  return (meters / 1000).toFixed(2).replace('.', ',')
}

function formatSleep(totalMinutes) {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return '--'
  const hours = Math.floor(totalMinutes / 60)
  const minutes = Math.floor(totalMinutes % 60)
  return `${hours}h${pad2(minutes)}min`
}

WatchFace({
  build() {
    createWidget(widget.IMG, {
      x: 0,
      y: 0,
      w: 390,
      h: 450,
      src: 'background-functional-soft.png',
    })

    // prop.MORE recebe o mesmo objeto de opcoes do createWidget, entao um objeto
    // parcial zera o que ficar de fora (inclusive text e geometria). Por isso a
    // atualizacao da hora reenvia todas as opcoes do digito.
    const digitOptions = (x, value) => ({
      x,
      y: 158,
      w: 66,
      h: 108,
      text: value,
      text_size: 116,
      text_style: text_style.ELLIPSIS,
      color: 0xff7a00,
      align_h: value === '1' ? align.RIGHT : align.CENTER_H,
      align_v: align.CENTER_V,
      font: DIGITAL_FONT,
    })

    const timeDigits = TIME_DIGIT_SLOTS.map((x) => createWidget(widget.TEXT, digitOptions(x, '0')))

    // w=0 nao esconde a imagem: o widget trata 0 como "nao informado" e desenha o
    // PNG inteiro, o que faria um medidor zerado aparecer cheio. Zerado some por
    // alpha, e o recorte por largura so vale de um tracinho para cima.
    const gaugeOptions = (gauge, litCount) => ({
      x: gauge.x,
      y: gauge.y,
      w: litCount <= 0 ? gauge.w : Math.min(gauge.w, Math.round((litCount - 1) * gauge.pitch) + gauge.tick),
      h: gauge.h,
      src: gauge.src,
      alpha: litCount <= 0 ? 0 : 255,
    })

    const addGauge = (gauge) => {
      const instance = createWidget(widget.IMG, gaugeOptions(gauge, 0))
      return (value, goal) => {
        const ratio = Number.isFinite(value) && Number.isFinite(goal) && goal > 0 ? value / goal : 0
        // Trunca em vez de arredondar: um tracinho so acende depois de conquistado,
        // entao o medidor so fica cheio ao bater a meta. Arredondando, a bateria de
        // 4 slots ja aparecia cheia com 88%. Qualquer progresso acima de zero ainda
        // acende ao menos um, para o medidor nao ficar vazio com valor no campo.
        const lit = ratio <= 0 ? 0 : Math.max(1, Math.min(gauge.count, Math.floor(gauge.count * ratio)))
        instance.setProperty(prop.MORE, gaugeOptions(gauge, lit))
      }
    }

    const weatherIcon = createWidget(widget.IMG, {
      ...WEATHER_ICON,
      src: 'weather-cloudy.png',
      alpha: 0,
    })
    const setWeatherIcon = (index) => {
      const name = WEATHER_ICONS[index]
      weatherIcon.setProperty(prop.MORE, {
        ...WEATHER_ICON,
        src: `weather-${name || 'cloudy'}.png`,
        alpha: name ? 255 : 0,
      })
    }

    const setStepsGauge = addGauge(GAUGES.steps)
    const setCaloriesGauge = addGauge(GAUGES.calories)
    const setDistanceGauge = addGauge(GAUGES.distance)
    const setSleepGauge = addGauge(GAUGES.sleep)
    const setBatteryGauge = addGauge(GAUGES.battery)

    const addText = (x, y, w, h, text, size, color, horizontalAlign = align.CENTER_H, font = null) => {
      const options = {
        x,
        y,
        w,
        h,
        text,
        text_size: size,
        text_style: text_style.ELLIPSIS,
        color,
        align_h: horizontalAlign,
        align_v: align.CENTER_V,
      }
      if (font) options.font = font
      return createWidget(widget.TEXT, options)
    }

    // Os y saem dos rotulos da arte: BATERIA/CLIMA em 66..74, PASSOS/DISTANCIA em
    // 301..306 e CALORIAS/SONO em 363..368, ou seja 62 px de passo entre as duas
    // linhas de paineis. A caixa DIA tem interior em 373..394.
    // Larguras medidas na fonte nativa do aparelho via getTextLayout, sempre no
    // pior valor de cada campo, para nada cair no ELLIPSIS:
    // "100%" 68 / "-10C" 70 / "31/12" 75 / "99999" 65 / "9999" 52 / "12,34" 62 /
    // "12h59min" 80. Passos e sono definem os limites: acima de 23 e 18 eles
    // estouram o painel, por isso nao acompanham o corpo maior dos demais campos.
    const batteryText = addText(87, 73, 83, 38, '--%', 29, 0xffffff)
    const temperatureText = addText(211, 73, 104, 38, '--°', 29, 0xffffff)
    const dateText = addText(24, 330, 96, 38, '--/--', 29, 0xffffff)
    const weekdayText = addText(32, 371, 80, 24, '--', 17, 0xff7a00, align.CENTER_H, FONT)
    const stepsText = addText(176, 303, 66, 34, '--', 23, 0xffffff, align.LEFT)
    // Distancia e sono ficam a direita porque esbarram na arte: o "KM" comeca em
    // x=335 e a borda do painel de sono logo depois de x=364.
    const distanceText = addText(270, 306, 63, 33, '--,--', 24, 0xff7a00, align.RIGHT)
    const caloriesText = addText(176, 365, 66, 34, '--', 23, 0xffffff, align.LEFT)
    const sleepText = addText(281, 368, 83, 33, '--', 18, 0xff7a00, align.RIGHT)

    const time = new Time()
    const refreshTime = () => {
      const digits = `${pad2(time.getHours())}${pad2(time.getMinutes())}`
      timeDigits.forEach((digit, index) => {
        digit.setProperty(prop.MORE, digitOptions(TIME_DIGIT_SLOTS[index], digits[index]))
      })
    }
    const refreshDate = () => {
      dateText.setProperty(
        prop.TEXT,
        `${pad2(time.getDate())}/${pad2(time.getMonth())}`,
      )
      const dayIndex = time.getDay() - 1
      weekdayText.setProperty(prop.TEXT, WEEKDAYS[dayIndex] || '--')
    }

    const battery = new Battery()
    const refreshBattery = () => {
      const level = readNumber(() => battery.getCurrent(), -1)
      batteryText.setProperty(prop.TEXT, level < 0 ? '--%' : `${Math.round(level)}%`)
      setBatteryGauge(Math.max(0, level), 100)
    }

    const step = new Step()
    const refreshSteps = () => {
      const count = readNumber(() => step.getCurrent(), -1)
      stepsText.setProperty(prop.TEXT, count < 0 ? '--' : String(Math.round(count)))
      setStepsGauge(Math.max(0, count), readNumber(() => step.getTarget(), STEPS_GOAL_FALLBACK))
    }

    const distance = new Distance()
    const refreshDistance = () => {
      const meters = readNumber(() => distance.getCurrent(), -1)
      distanceText.setProperty(prop.TEXT, formatDistance(meters))
      setDistanceGauge(Math.max(0, meters), DISTANCE_GOAL_METERS)
    }

    const calorie = new Calorie()
    const refreshCalories = () => {
      const count = readNumber(() => calorie.getCurrent(), -1)
      caloriesText.setProperty(prop.TEXT, count < 0 ? '--' : String(Math.round(count)))
      setCaloriesGauge(Math.max(0, count), readNumber(() => calorie.getTarget(), CALORIES_GOAL_FALLBACK))
    }

    const sleep = new Sleep()
    const refreshSleep = () => {
      const info = readValue(() => sleep.getInfo(), null)
      const minutes = info && Number.isFinite(info.totalTime) ? info.totalTime : 0
      sleepText.setProperty(prop.TEXT, info ? formatSleep(info.totalTime) : '--')
      setSleepGauge(Math.max(0, minutes), SLEEP_GOAL_MINUTES)
    }

    let weather
    try {
      weather = new Weather()
    } catch (error) {
      weather = null
    }
    const refreshWeather = () => {
      try {
        if (!weather) throw new Error('Weather sensor unavailable')
        const result = typeof weather.getForecastWeather === 'function'
          ? weather.getForecastWeather()
          : weather.getForecast()
        const forecast = result && result.forecastData && result.forecastData.data
        const today = forecast && forecast[0]
        const temperature = today && today.high
        setWeatherIcon(today ? today.index : -1)
        if (!Number.isFinite(temperature)) {
          temperatureText.setProperty(prop.TEXT, '--°')
          return
        }

        const isFahrenheit = readNumber(() => getTemperatureUnit(), -1) === TEMPERATURE_UNIT_FAHRENHEIT
        temperatureText.setProperty(
          prop.TEXT,
          `${Math.round(temperature)}°${isFahrenheit ? 'F' : 'C'}`,
        )
      } catch (error) {
        setWeatherIcon(-1)
        temperatureText.setProperty(prop.TEXT, '--°')
      }
    }

    refreshTime()
    refreshDate()
    refreshBattery()
    refreshSteps()
    refreshDistance()
    refreshCalories()
    refreshSleep()
    refreshWeather()

    // Weather e Sleep nao expoem onChange, entao dependem do tick de minuto
    // para refletir a sincronizacao do app Zepp depois que a tela ja carregou.
    time.onPerMinute(() => {
      refreshTime()
      refreshWeather()
      refreshSleep()
    })
    time.onPerDay(refreshDate)
    battery.onChange(refreshBattery)
    step.onChange(refreshSteps)
    distance.onChange(refreshDistance)
    calorie.onChange(refreshCalories)
  },
})
