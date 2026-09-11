import swisseph as swe
from datetime import datetime, timedelta, timezone
from timezonefinder import TimezoneFinder
import pytz

# Planet names for easy reading
PLANETS = {
    swe.SUN: "Sun",
    swe.MOON: "Moon",
    swe.MERCURY: "Mercury",
    swe.VENUS: "Venus",
    swe.MARS: "Mars",
    swe.JUPITER: "Jupiter",
    swe.SATURN: "Saturn",
    swe.URANUS: "Uranus",
    swe.NEPTUNE: "Neptune",
    swe.PLUTO: "Pluto",
}

# Zodiac signs
SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer",
    "Leo", "Virgo", "Libra", "Scorpio",
    "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]

# ── Vimshottari Dasha constants ──
# Fixed 9-lord sequence and each lord's period length in years (totals 120).
DASHA_SEQUENCE = ["Ketu", "Venus", "Sun", "Moon", "Mars",
                   "Rahu", "Jupiter", "Saturn", "Mercury"]
DASHA_YEARS = {
    "Ketu": 7, "Venus": 20, "Sun": 6, "Moon": 10, "Mars": 7,
    "Rahu": 18, "Jupiter": 16, "Saturn": 19, "Mercury": 17,
}
TOTAL_DASHA_YEARS = 120
DAYS_PER_YEAR = 365.25  # standard approximation used in Vimshottari timing

# The 27 nakshatras are ruled by the 9 dasha lords in the same fixed
# sequence, repeating 3 times (27 = 9 * 3).
NAKSHATRA_LORDS = DASHA_SEQUENCE * 3
NAKSHATRA_SPAN = 360 / 27  # 13.333...° each

_tf = TimezoneFinder()


def get_sign(degree):
    """Convert degree to zodiac sign"""
    return SIGNS[int(degree / 30) % 12]


def get_degree_in_sign(degree):
    """Get degree within a sign"""
    return round(degree % 30, 2)


def local_time_to_utc(year, month, day, hour, minute, latitude, longitude):
    """
    Convert the birth date/time (given in LOCAL time at the birth location)
    into UTC decimal hours, using the coordinates to look up the correct
    timezone/DST rules for that exact historical date.
    """
    tz_name = _tf.timezone_at(lat=latitude, lng=longitude)
    if tz_name is None:
        # Fallback: no timezone found for these coordinates (e.g. open ocean).
        # Treat as UTC rather than silently guessing.
        raise ValueError(
            f"Could not determine timezone for coordinates ({latitude}, {longitude})"
        )

    tz = pytz.timezone(tz_name)
    naive_dt = datetime(year, month, day, hour, minute)
    local_dt = tz.localize(naive_dt)
    utc_dt = local_dt.astimezone(pytz.utc)

    utc_hour_decimal = utc_dt.hour + utc_dt.minute / 60.0 + utc_dt.second / 3600.0
    return utc_dt.year, utc_dt.month, utc_dt.day, utc_hour_decimal, tz_name


def calculate_vimshottari_dasha(moon_degree, birth_dt_utc):
    """
    Compute the full Vimshottari Mahadasha/Antardasha timeline for a chart,
    based on the Moon's sidereal longitude at birth.

    Returns a list of mahadasha periods (covering a full 120-year cycle
    from birth), each with its own list of antardasha (sub-period) date
    windows.
    """
    # Which nakshatra is the Moon in, and how far through it (0.0-1.0)?
    nak_index = int(moon_degree // NAKSHATRA_SPAN) % 27
    starting_lord = NAKSHATRA_LORDS[nak_index]
    portion_elapsed = (moon_degree % NAKSHATRA_SPAN) / NAKSHATRA_SPAN

    # The first mahadasha is already partway done at birth — only the
    # remaining balance applies.
    balance_years = (1 - portion_elapsed) * DASHA_YEARS[starting_lord]

    start_seq_idx = DASHA_SEQUENCE.index(starting_lord)

    mahadashas = []
    cursor = birth_dt_utc
    years_covered = 0.0
    i = 0
    while years_covered < TOTAL_DASHA_YEARS:
        lord = DASHA_SEQUENCE[(start_seq_idx + i) % 9]
        duration_years = balance_years if i == 0 else DASHA_YEARS[lord]
        start = cursor
        end = start + timedelta(days=duration_years * DAYS_PER_YEAR)

        mahadashas.append({
            "lord": lord,
            "start": start.strftime("%Y-%m-%d"),
            "end": end.strftime("%Y-%m-%d"),
            "antardashas": _calculate_antardashas(lord, duration_years, start),
        })

        cursor = end
        years_covered += duration_years
        i += 1

    return mahadashas


def _calculate_antardashas(maha_lord, maha_years, maha_start):
    """
    Sub-periods within one mahadasha. Antardasha of lord A within a
    mahadasha of lord M (length ML years) lasts (ML * A_years / 120) years.
    The sequence starts with the mahadasha's own lord, then follows the
    standard 9-lord order.
    """
    start_idx = DASHA_SEQUENCE.index(maha_lord)
    cursor = maha_start
    antardashas = []
    for i in range(9):
        sub_lord = DASHA_SEQUENCE[(start_idx + i) % 9]
        sub_years = (maha_years * DASHA_YEARS[sub_lord]) / TOTAL_DASHA_YEARS
        end = cursor + timedelta(days=sub_years * DAYS_PER_YEAR)
        antardashas.append({
            "lord": sub_lord,
            "start": cursor.strftime("%Y-%m-%d"),
            "end": end.strftime("%Y-%m-%d"),
        })
        cursor = end
    return antardashas


def get_current_dasha(mahadashas, as_of=None):
    """Find which mahadasha/antardasha window contains `as_of` (default: now)."""
    if as_of is None:
        as_of = datetime.now(timezone.utc)
    as_of_str = as_of.strftime("%Y-%m-%d")

    for md in mahadashas:
        if md["start"] <= as_of_str <= md["end"]:
            current = {"mahadasha": md["lord"], "antardasha": None, "window": None}
            for ad in md["antardashas"]:
                if ad["start"] <= as_of_str <= ad["end"]:
                    current["antardasha"] = ad["lord"]
                    current["window"] = f"{ad['start']} to {ad['end']}"
                    break
            return current
    return None


def calculate_chart(year, month, day, hour, minute, latitude, longitude):
    """
    Main function — calculates full birth chart.
    Uses sidereal (Vedic) positions with the Lahiri ayanamsa, since the
    chart includes Rahu/Ketu and renders as a North Indian diamond chart —
    both are sidereal/Vedic conventions.
    Returns planets and houses.
    """
    swe.set_ephe_path(None)

    # Convert the birth time (assumed to be LOCAL time at the birth
    # location) into UTC before calculating anything. Without this,
    # positions can be off by several hours' worth of planetary/house
    # movement.
    utc_year, utc_month, utc_day, utc_hour, tz_name = local_time_to_utc(
        year, month, day, hour, minute, latitude, longitude
    )

    julian_day = swe.julday(utc_year, utc_month, utc_day, utc_hour)

    # Use sidereal zodiac with the Lahiri ayanamsa (standard for Vedic charts)
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    sidereal_flag = swe.FLG_SIDEREAL | swe.FLG_SWIEPH

    # Calculate planetary positions
    planets = []
    for planet_id, planet_name in PLANETS.items():
        position, _ = swe.calc_ut(julian_day, planet_id, sidereal_flag)
        degree = position[0]
        planets.append({
            "planet": planet_name,
            "degree": round(degree, 2),
            "sign": get_sign(degree),
            "degree_in_sign": get_degree_in_sign(degree)
        })

    # Calculate houses (Placidus system), also in sidereal
    houses, ascmc = swe.houses_ex(julian_day, latitude, longitude, b'P', sidereal_flag)

    house_list = []
    for i, cusp in enumerate(houses):
        house_list.append({
            "house": i + 1,
            "degree": round(cusp, 2),
            "sign": get_sign(cusp)
        })

    # Ascendant and Midheaven
    ascendant = {
        "degree": round(ascmc[0], 2),
        "sign": get_sign(ascmc[0])
    }
    midheaven = {
        "degree": round(ascmc[1], 2),
        "sign": get_sign(ascmc[1])
    }

    # Add Rahu (Mean North Node) and Ketu (South Node, always 180° opposite)
    rahu_pos, _ = swe.calc_ut(julian_day, swe.MEAN_NODE, sidereal_flag)
    rahu_degree = rahu_pos[0]
    ketu_degree = (rahu_degree + 180) % 360
    planets.append({
        "planet": "Rahu",
        "degree": round(rahu_degree, 2),
        "sign": get_sign(rahu_degree),
        "degree_in_sign": get_degree_in_sign(rahu_degree)
    })
    planets.append({
        "planet": "Ketu",
        "degree": round(ketu_degree, 2),
        "sign": get_sign(ketu_degree),
        "degree_in_sign": get_degree_in_sign(ketu_degree)
    })

    # ── Vimshottari Dasha (planetary period timeline) ──
    # Based on the Moon's sidereal position at birth. Gives real date
    # windows the chatbot can use to answer "when" questions, instead of
    # only describing themes with no timing behind them.
    moon_degree = next(p["degree"] for p in planets if p["planet"] == "Moon")
    birth_dt_utc = datetime(utc_year, utc_month, utc_day, tzinfo=timezone.utc) \
        + timedelta(hours=utc_hour)
    mahadashas = calculate_vimshottari_dasha(moon_degree, birth_dt_utc)
    current_dasha = get_current_dasha(mahadashas)

    return {
        "planets": planets,
        "houses": house_list,
        "ascendant": ascendant,
        "midheaven": midheaven,
        "dasha": {
            "system": "Vimshottari",
            "current": current_dasha,
            "mahadashas": mahadashas,
        },
        "meta": {
            "timezone_used": tz_name,
            "utc_datetime": f"{utc_year:04d}-{utc_month:02d}-{utc_day:02d} {utc_hour:.4f}h UTC",
            "ayanamsa": "Lahiri",
            "house_system": "Placidus"
        }
    }