'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, TrendingDown, Calendar } from 'lucide-react';

interface ForecastDay {
  date: string;
  total_btc: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  whale_count: number;
  events: Array<{
    delegator: string;
    amount_btc: number;
    tx_hash: string;
  }>;
}

interface ForecastData {
  forecast: ForecastDay[];
  supply_shock_dates: string[];
  statistics: {
    total_btc_unlocking: number;
    max_daily_unlock: number;
    avg_daily_unlock: number;
    days_analyzed: number;
    shock_count: number;
  };
}

export default function UnbondingForecast() {
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    const fetchForecast = async () => {
      try {
        const { apiCall } = await import('@/lib/api');
        const res = await apiCall('/unbonding-forecast');
        const data = await res.json();

        // Validate data structure to prevent .map() errors
        if (data && typeof data === 'object') {
          const validatedData: ForecastData = {
            forecast: Array.isArray(data.forecast) ? data.forecast : [],
            supply_shock_dates: Array.isArray(data.supply_shock_dates) ? data.supply_shock_dates : [],
            statistics: data.statistics || {
              total_btc_unlocking: 0,
              max_daily_unlock: 0,
              avg_daily_unlock: 0,
              days_analyzed: 0,
              shock_count: 0
            }
          };
          setForecast(validatedData);
        } else {
          console.warn('Invalid forecast data format:', data);
          setForecast(null);
        }
      } catch (error) {
        console.error('Failed to fetch unbonding forecast:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchForecast();
    const interval = setInterval(fetchForecast, 60000);
    return () => clearInterval(interval);
  }, []);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW':
        return 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700';
      case 'MEDIUM':
        return 'bg-yellow-100 dark:bg-yellow-900 border-yellow-300 dark:border-yellow-700';
      case 'HIGH':
        return 'bg-orange-100 dark:bg-orange-900 border-orange-300 dark:border-orange-700';
      case 'CRITICAL':
        return 'bg-red-100 dark:bg-red-900 border-red-300 dark:border-red-700';
      default:
        return 'bg-gray-100 dark:bg-gray-800';
    }
  };

  const getRiskTextColor = (risk: string) => {
    switch (risk) {
      case 'LOW':
        return 'text-green-700 dark:text-green-300';
      case 'MEDIUM':
        return 'text-yellow-700 dark:text-yellow-300';
      case 'HIGH':
        return 'text-orange-700 dark:text-orange-300';
      case 'CRITICAL':
        return 'text-red-700 dark:text-red-300';
      default:
        return 'text-gray-700 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50 dark:from-blue-950 dark:via-indigo-950 dark:to-blue-950 rounded-xl p-8 border border-blue-200 dark:border-blue-800">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full animate-spin" style={{ maskImage: 'radial-gradient(circle, transparent 30%, black 70%)' }}></div>
            <div className="absolute inset-2 bg-blue-50 dark:bg-blue-950 rounded-full flex items-center justify-center">
              <Calendar className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-pulse" />
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-1">
              Loading Unbonding Forecast
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 animate-pulse">
              Analyzing whale unbonding events and liquidity patterns...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!forecast) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
        <div className="text-red-600 dark:text-red-400">Failed to load forecast</div>
      </div>
    );
  }

  const selectedDayData = selectedDate
    ? forecast.forecast.find((d) => d.date === selectedDate)
    : null;

  // Generate calendar for current month
  const generateMonthCalendar = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const weeks = [];
    let week = new Array(firstDay).fill(null);

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = new Date(year, month, day).toISOString().split('T')[0];
      week.push({ day, dateStr });

      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }

    if (week.length > 0) {
      while (week.length < 7) {
        week.push(null);
      }
      weeks.push(week);
    }

    return {
      name: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      weeks,
    };
  };

  const currentMonthData = generateMonthCalendar(currentMonth);

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
            🌦️ Unbonding Weather Forecast
          </h3>
        </div>

        <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
          Predict liquidity shocks from whale unbonding events. Red days = massive supply unlock incoming.
        </p>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-blue-900 rounded p-3">
            <div className="text-xs text-gray-600 dark:text-gray-400">Total Unlocking</div>
            <div className="text-xl font-bold text-blue-600 dark:text-blue-300">
              {forecast.statistics.total_btc_unlocking.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">BTC</div>
          </div>

          <div className="bg-white dark:bg-blue-900 rounded p-3">
            <div className="text-xs text-gray-600 dark:text-gray-400">Max Daily</div>
            <div className="text-xl font-bold text-orange-600 dark:text-orange-300">
              {forecast.statistics.max_daily_unlock.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">BTC</div>
          </div>

          <div className="bg-white dark:bg-blue-900 rounded p-3">
            <div className="text-xs text-gray-600 dark:text-gray-400">Avg Daily</div>
            <div className="text-xl font-bold text-blue-600 dark:text-blue-300">
              {forecast.statistics.avg_daily_unlock.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">BTC</div>
          </div>

          <div className="bg-white dark:bg-blue-900 rounded p-3">
            <div className="text-xs text-gray-600 dark:text-gray-400">Supply Shocks</div>
            <div className="text-xl font-bold text-red-600 dark:text-red-300">
              {forecast.statistics.shock_count}
            </div>
            <div className="text-xs text-gray-500">Days</div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            Liquidity Calendar
          </h4>
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousMonth}
              className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition"
            >
              ← Prev
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition"
            >
              Today
            </button>
            <button
              onClick={goToNextMonth}
              className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition"
            >
              Next →
            </button>
          </div>
        </div>

        <div>
          <h5 className="text-sm font-semibold mb-4 text-gray-700 dark:text-gray-300">{currentMonthData.name}</h5>

          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-xs font-semibold text-gray-600 dark:text-gray-400 py-2 h-8">
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {currentMonthData.weeks.map((week, weekIdx) =>
              week.map((dayData, dayIdx) => {
                const forecastDay = dayData ? forecast.forecast.find((d) => d.date === dayData.dateStr) : null;
                return (
                  <div key={`${weekIdx}-${dayIdx}`} className="h-16">
                    {dayData ? (
                      <button
                        onClick={() => setSelectedDate(dayData.dateStr)}
                        className={`w-full h-full rounded border-2 p-1 text-center transition-all hover:shadow-lg ${getRiskColor(
                          forecastDay?.risk_level || 'LOW'
                        )} ${selectedDate === dayData.dateStr ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
                      >
                        <div className="text-xs font-bold text-gray-900 dark:text-white">{dayData.day}</div>
                        <div className={`text-xs font-semibold ${getRiskTextColor(forecastDay?.risk_level || 'LOW')}`}>
                          {forecastDay && forecastDay.total_btc > 0 ? `${(forecastDay.total_btc / 1000).toFixed(1)}k` : '-'}
                        </div>
                      </button>
                    ) : (
                      <div className="w-full h-full bg-gray-50 dark:bg-gray-800 rounded border-2 border-gray-200 dark:border-gray-700"></div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Low (&lt;100 BTC)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Medium (100-500 BTC)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-100 border border-orange-300 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">High (500-2k BTC)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Critical (&gt;2k BTC)</span>
          </div>
        </div>
      </div>

      {/* Selected Day Details */}
      {selectedDayData && (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className={`w-5 h-5 ${getRiskTextColor(selectedDayData.risk_level)}`} />
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              {new Date(selectedDayData.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </h4>
          </div>

          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Total Unlocking</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedDayData.total_btc.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">BTC</div>
              </div>
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Risk Level</div>
                <div className={`text-2xl font-bold ${getRiskTextColor(selectedDayData.risk_level)}`}>
                  {selectedDayData.risk_level}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Whales</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedDayData.whale_count}
                </div>
              </div>
            </div>
          </div>

          <h5 className="font-semibold text-gray-900 dark:text-white mb-3">Unbonding Events</h5>
          <div className="space-y-2">
            {selectedDayData.events.map((event, idx) => (
              <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-800 rounded flex justify-between items-center">
                <div>
                  <div className="text-sm font-mono text-gray-600 dark:text-gray-400">{event.delegator}</div>
                  <div className="text-xs text-gray-500">TX: {event.tx_hash}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900 dark:text-white">{event.amount_btc.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">BTC</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Supply Shock Warning */}
      {forecast.supply_shock_dates.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950 rounded-lg p-4 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
            <h5 className="font-semibold text-red-900 dark:text-red-100">⚠️ Upcoming Supply Shocks</h5>
          </div>
          <p className="text-sm text-red-800 dark:text-red-200 mb-3">
            Massive liquidity unlocks predicted on these dates:
          </p>
          <div className="flex flex-wrap gap-2">
            {forecast.supply_shock_dates.map((date) => (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className="px-3 py-1 bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-100 rounded text-sm font-medium hover:bg-red-300 dark:hover:bg-red-700 transition"
              >
                {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
