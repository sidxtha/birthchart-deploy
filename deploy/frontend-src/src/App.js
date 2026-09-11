import React, { useState } from "react";
import "./App.css";

import Background from "./components/Background";
import Header from "./components/Header";
import Hero from "./components/Hero";
import Card from "./components/Card";
import Button from "./components/Button";
import Loading from "./components/Loading";
import Stats from "./components/Stats";

import BirthChart from "./BirthChart";
import ChatBot from "./ChatBot";

const PLANET_SYMBOLS = {
  Sun: "☀",
  Moon: "☽",
  Mercury: "☿",
  Venus: "♀",
  Mars: "♂",
  Jupiter: "♃",
  Saturn: "♄",
  Uranus: "♅",
  Neptune: "♆",
  Pluto: "♇",
  Rahu: "☊",
  Ketu: "☋",
};

export default function App() {
  const [formData, setFormData] = useState({
    year: "",
    month: "",
    day: "",
    hour: "",
    minute: "",
  });

  const [citySearch, setCitySearch] = useState("");
  const [cityResults, setCityResults] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);

  const [chart, setChart] = useState(null);

  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  const [error, setError] = useState("");

  async function searchCity() {
    if (!citySearch.trim()) return;

    setSearching(true);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          citySearch
        )}&format=json&limit=5`
      );

      const data = await res.json();

      setCityResults(data);
    } catch (err) {
      console.error(err);
    }

    setSearching(false);
  }

  function selectCity(city) {
    setSelectedCity(city);

    setCityResults([]);

    setCitySearch(
      city.display_name
        .split(",")
        .slice(0, 2)
        .join(", ")
    );
  }

  async function handleSubmit() {
    if (!selectedCity) {
      alert("Please select a birth city.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8001"}/chart`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            year: Number(formData.year),
            month: Number(formData.month),
            day: Number(formData.day),
            hour: Number(formData.hour),
            minute: Number(formData.minute),
            latitude: Number(selectedCity.lat),
            longitude: Number(selectedCity.lon),
          }),
        }
      );

      if (!response.ok)
        throw new Error("Failed");

      const data = await response.json();

      setChart(data);
    } catch (err) {
      console.error(err);

      setError(
        "Unable to generate chart. Is the backend running?"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Background />

      <Header />

      <Hero />

      <main className="main-container">

        <div className="dashboard">

          <div className="left-column">

            <Card
              title="Birth Details"
              subtitle="Enter your birth information accurately."
            >

              <div className="form-grid">

                <div className="field">
                  <label>Year</label>

                  <input
                    value={formData.year}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        year: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="field">

                  <label>Month</label>

                  <select
                    value={formData.month}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        month: e.target.value,
                      })
                    }
                  >
                    <option value="">Month</option>

                    {[
                      "January",
                      "February",
                      "March",
                      "April",
                      "May",
                      "June",
                      "July",
                      "August",
                      "September",
                      "October",
                      "November",
                      "December",
                    ].map((month, index) => (
                      <option
                        key={index}
                        value={index + 1}
                      >
                        {month}
                      </option>
                    ))}

                  </select>

                </div>

                <div className="field">

                  <label>Day</label>

                  <input
                    value={formData.day}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        day: e.target.value,
                      })
                    }
                  />

                </div>

                <div className="field">

                  <label>Hour</label>

                  <input
                    value={formData.hour}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        hour: e.target.value,
                      })
                    }
                  />

                </div>

                <div className="field">

                  <label>Minute</label>

                  <input
                    value={formData.minute}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        minute: e.target.value,
                      })
                    }
                  />

                </div>

                <div className="field full">

                  <label>Birth City</label>

                  <div className="city-search">

                    <input
                      value={citySearch}
                      placeholder="Search city..."
                      onChange={(e) =>
                        setCitySearch(e.target.value)
                      }
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        searchCity()
                      }
                    />

                    <Button
                      onClick={searchCity}
                    >
                      {searching
                        ? "..."
                        : "Search"}
                    </Button>

                  </div>
                                    {cityResults.length > 0 && (
                    <div className="city-dropdown">
                      {cityResults.map((city, index) => (
                        <div
                          key={index}
                          className="city-item"
                          onClick={() => selectCity(city)}
                        >
                          {city.display_name}
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedCity && (
                    <div className="selected-city">
                      ✓ {citySearch}
                    </div>
                  )}

                </div>

              </div>

              {error && (
                <div className="form-error">
                  {error}
                </div>
              )}

              <Button
                fullWidth
                loading={loading}
                onClick={handleSubmit}
              >
                ✨ Generate Birth Chart
              </Button>

            </Card>

            {loading && (
              <Loading />
            )}

            {chart && (
              <>
                <Stats chart={chart} />

                <Card
                  title="Birth Chart"
                  subtitle="North Indian Style"
                >
                  <BirthChart chart={chart} />
                </Card>
              </>
            )}

          </div>

          <div className="middle-column">

            <Card
              title="Planetary Positions"
              subtitle="Calculated from your birth data"
            >

              {!chart ? (
                <div className="empty-state">
                  Generate your birth chart to view planetary positions.
                </div>
              ) : (
                <table className="planet-table">

                  <thead>
                    <tr>
                      <th>Planet</th>
                      <th>Sign</th>
                      <th>Degree</th>
                    </tr>
                  </thead>

                  <tbody>

                    {chart.planets.map((planet, index) => (

                      <tr key={index}>

                        <td>
                          {PLANET_SYMBOLS[planet.planet]}{" "}
                          {planet.planet}
                        </td>

                        <td>
                          <span className="badge">
                            {planet.sign}
                          </span>
                        </td>

                        <td>
                          {planet.degree_in_sign}°
                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>
              )}

            </Card>

            {chart && (

              <Card
                title="House Cusps"
                subtitle="Astrological Houses"
              >

                <table className="planet-table">

                  <thead>

                    <tr>
                      <th>House</th>
                      <th>Sign</th>
                      <th>Degree</th>
                    </tr>

                  </thead>

                  <tbody>

                    {chart.houses.map((house, index) => (

                      <tr key={index}>

                        <td>
                          House {house.house}
                        </td>

                        <td>
                          <span className="badge">
                            {house.sign}
                          </span>
                        </td>

                        <td>
                          {house.degree}°
                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </Card>

            )}

          </div>

          {chart && (

            <div className="right-column">

              <ChatBot chart={chart} />

            </div>

          )}

        </div>

      </main>

    </>
  );
}