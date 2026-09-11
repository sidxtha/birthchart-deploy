import React, { useEffect, useRef, useState } from 'react';
import './App.css';

// Import components from your src/components folder
import Header from './components/Header';
import Hero from './components/Hero';
import Card from './components/Card';
import Button from './components/Button';
import Select from './components/Select';
import Background from './components/Background';
import Loading from './components/Loading';
import Stats from './components/Stats';

// Import components sitting in src/ root
import ChatBot from './ChatBot';
import BirthChart from './BirthChart';

// API helpers
import { fetchBirthChart, searchCities } from './api';

const MONTH_OPTIONS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

function App() {
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState(null);
  const [error, setError] = useState('');

  // Birth date/time fields
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');

  // Birth city search
  const [cityQuery, setCityQuery] = useState('');
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [cityLoading, setCityLoading] = useState(false);

  const formSectionRef = useRef(null);

  const scrollToForm = () => {
    formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    if (selectedCity && cityQuery === selectedCity.label) return;
    if (cityQuery.trim().length < 2) {
      setCitySuggestions([]);
      return;
    }

    let cancelled = false;
    setCityLoading(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchCities(cityQuery);
        if (!cancelled) setCitySuggestions(results);
      } catch {
        if (!cancelled) setCitySuggestions([]);
      } finally {
        if (!cancelled) setCityLoading(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [cityQuery]);

  const handleCitySelect = (city) => {
    setSelectedCity(city);
    setCityQuery(city.label);
    setCitySuggestions([]);
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');

    if (!year || !month || !day || hour === '' || minute === '') {
      setError('Please fill in year, month, day, hour, and minute.');
      return;
    }
    if (!selectedCity) {
      setError('Please search for and select a birth city.');
      return;
    }

    setLoading(true);
    setChartData(null);

    try {
      const result = await fetchBirthChart({
        year: Number(year),
        month: Number(month),
        day: Number(day),
        hour: Number(hour),
        minute: Number(minute),
        latitude: selectedCity.latitude,
        longitude: selectedCity.longitude,
      });
      setChartData(result);
    } catch (err) {
      setError(err.message || 'Something went wrong generating the chart.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Cosmic Background */}
      <Background />

      {/* Full-width Top Header Bar */}
      <Header onGenerateClick={scrollToForm} />

      <div className="main-container">
        {/* Hero Headline Section */}
        <Hero onGenerateClick={scrollToForm} />

        {/* Main 3-Column Grid */}
        <main className="dashboard">
          {/* Column 1: Input Form */}
          <div ref={formSectionRef} className="form-section-target">
            <Card title="Birth Details" subtitle="Enter your birth information accurately">
              <form onSubmit={handleGenerate}>
                {error && <div className="form-error">{error}</div>}

                <div className="form-grid">
                  <div className="field">
                    <label>Year</label>
                    <input
                      type="number"
                      placeholder="YYYY"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label>Month</label>
                    <Select
                      value={month}
                      onChange={setMonth}
                      options={MONTH_OPTIONS}
                      placeholder="Month"
                    />
                  </div>

                  <div className="field">
                    <label>Day</label>
                    <input
                      type="number"
                      placeholder="DD"
                      value={day}
                      onChange={(e) => setDay(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label>Hour</label>
                    <input
                      type="number"
                      placeholder="HH (0-23)"
                      value={hour}
                      onChange={(e) => setHour(e.target.value)}
                    />
                  </div>

                  <div className="field full">
                    <label>Minute</label>
                    <input
                      type="number"
                      placeholder="MM"
                      value={minute}
                      onChange={(e) => setMinute(e.target.value)}
                    />
                  </div>

                  <div className="field full">
                    <label>Birth City</label>
                    <div className="city-search-wrapper">
                      <div className="city-search">
                        <input
                          type="text"
                          placeholder="Type city name..."
                          value={cityQuery}
                          onChange={(e) => {
                            setCityQuery(e.target.value);
                            setSelectedCity(null);
                          }}
                        />
                      </div>

                      {cityQuery.trim().length >= 2 && !selectedCity && (
                        <div className="city-dropdown">
                          {cityLoading ? (
                            <div className="city-item">Searching...</div>
                          ) : citySuggestions.length > 0 ? (
                            citySuggestions.map((city) => (
                              <div
                                key={city.id}
                                className="city-item"
                                onClick={() => handleCitySelect(city)}
                              >
                                {city.label}
                              </div>
                            ))
                          ) : (
                            <div className="city-item">No matches found</div>
                          )}
                        </div>
                      )}

                      {selectedCity && (
                        <div className="selected-city">
                          📍 {selectedCity.label} ({selectedCity.latitude.toFixed(2)},{' '}
                          {selectedCity.longitude.toFixed(2)})
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <Button type="submit" fullWidth loading={loading}>
                  Generate Birth Chart
                </Button>
              </form>
            </Card>
          </div>

          {/* Column 2: Chart & Planetary Positions */}
          <Card title="Planetary Positions" subtitle="Calculated from your birth details">
            {loading ? (
              <Loading />
            ) : chartData ? (
              <div>
                <BirthChart chart={chartData} />
                <Stats chart={chartData} />
              </div>
            ) : (
              <div className="empty-state">
                Generate your birth chart to view planetary positions.
              </div>
            )}
          </Card>

          {/* Column 3: AI Chatbot */}
          <ChatBot chart={chartData} />
        </main>
      </div>
    </>
  );
}

export default App;