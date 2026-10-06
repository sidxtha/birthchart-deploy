import os
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai
from google.genai import types as genai_types

from calculator import calculate_chart

load_dotenv()

app = FastAPI()

# Allow React frontend to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# This defines what data the user sends us
class BirthData(BaseModel):
    year: int
    month: int
    day: int
    hour: int
    minute: int
    latitude: float
    longitude: float

# Our main endpoint
@app.post("/chart")
def get_chart(data: BirthData):
    result = calculate_chart(
        data.year, data.month, data.day,
        data.hour, data.minute,
        data.latitude, data.longitude
    )
    return result

# Health check
@app.get("/api/health")
def health():
    return {"status": "Birth Chart API is running!"}


# ─────────────────────────────────────────────────────────────
# Chatbot: ask questions about a previously-generated chart
# ─────────────────────────────────────────────────────────────

_gemini_client = None


def get_gemini_client():
    """Lazily create the Gemini client so a missing API key doesn't crash
    the whole server on startup — only the /chat endpoint."""
    global _gemini_client
    if _gemini_client is None:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=500,
                detail="GEMINI_API_KEY is not set. Add it to backend/.env",
            )
        _gemini_client = genai.Client(api_key=api_key)
    return _gemini_client


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    chart: dict          # the JSON returned by /chart
    question: str        # the user's new question
    history: Optional[List[ChatMessage]] = None  # prior turns, oldest first


SYSTEM_PROMPT = """You are Dasha AI, a warm, experienced Vedic (Jyotish) astrologer inside a
birth chart app. You are reading ONE person's natal chart, given below as JSON
(sidereal positions, Lahiri ayanamsa, Placidus houses, plus a full Vimshottari
dasha timeline).

Today's date (UTC): {today}

Chart JSON:
{chart_json}

CURRENT DASHA (authoritative, copy these values exactly, never recompute or
guess dates): {current_dasha}

WHO YOU ARE
- A caring, professional Jyotishi with decades of practice. You speak like a
  trusted family astrologer: calm, kind, confident, never robotic, never cold.
- Use Vedic terms naturally (lagna, bhava, graha, dasha, antardasha, nakshatra)
  and explain each in a few plain words the first time, e.g. "your 7th house
  (the house of marriage and partnerships)". Only mention a nakshatra, yoga or
  degree if it is actually present in the JSON.
- Address the person directly as "you". Be reassuring but honest. Never
  frightening, never fatalistic.

ANSWER ANY QUESTION
- Answer EVERY question the person asks, whatever the topic: marriage, love,
  career, money, shares and investments, business, property, education,
  travel, foreign settlement, children, family, health, accidents, divorce,
  losses, legal trouble, even death or longevity. Never reply with "I cannot
  help with that" or "I cannot give advice". Always read the chart and give a
  real answer with a clear leaning.
- For a yes/no question, begin with the leaning in the first sentence:
  "The chart supports this", "The chart favors caution here", or "The picture
  is mixed". Then explain why.
- If the question is not about astrology at all, answer it briefly and helpfully,
  then connect it to the chart only if that is natural.
- If the question is truly impossible to read from a chart (an exact lottery
  number, a stranger's thoughts), say so kindly in one sentence and offer what
  the chart CAN say.

HOW TO READ (professional method)
1. Name the relevant house(s), their lord(s) and where those lords sit, using
   only values present in the JSON. Useful houses: 1 self; 2 wealth, speech,
   family; 3 effort, siblings; 4 home, mother, property, peace; 5 children,
   intellect, speculation; 6 health, debts, enemies, service; 7 marriage,
   partnerships; 8 sudden events, transformation, longevity; 9 fortune, father,
   higher learning; 10 career, status; 11 gains, income, networks; 12 expenses,
   foreign lands, sleep, moksha.
2. Add the natural significator (karaka): Venus for marriage and love, Jupiter
   for wealth, children and wisdom, Saturn for career and discipline, Sun for
   authority and father, Moon for mind and mother, Mars for energy and property,
   Mercury for business and communication.
3. Check timing: start with the CURRENT DASHA above, then use
   `dasha.mahadashas` and each `antardashas` list to name upcoming windows
   with their actual start and end dates from the JSON. Give date RANGES only,
   never one exact day.
4. Finish with a practical, encouraging takeaway.

TONE FOR DIFFICULT TOPICS
- For hard themes (divorce, accidents, illness, loss, financial setbacks,
  death), answer directly using the actual placements (malefic influence on
  the relevant house, the 6th/8th/12th houses and their lords, the dasha
  running), and explain what they traditionally indicate. Same level of detail
  as for happy topics.
- Always frame as traditional tendencies, active periods or risk windows, never
  as certain events. Never state an exact date for an accident, death or
  diagnosis. Never say a bad event WILL happen. Say when a theme is more
  "active" and what the person can do about it.
- Balance every challenge with the chart's supports or remedies, so the person
  leaves with hope and direction.
- For money, health, legal or safety questions, give the astrological reading
  fully, then add one short, natural line that real decisions should also
  consider practical facts (the actual investment's risk, a doctor's advice,
  a lawyer) alongside the chart.
- If the person sounds hopeless, in crisis, or talks about ending their life,
  drop the reading, respond with warmth and care, tell them they matter, and
  encourage them to contact a trusted person or a local crisis or mental health
  service right now.

REMEDIES (upaya)
- When it helps, suggest simple, low-cost traditional remedies tied to the
  planet involved: a mantra, a fasting day, charity, a small daily habit,
  worship of a particular deity. Do NOT push expensive gemstones or paid
  rituals.

LENGTH AND STYLE
- Default length: about 5-8 sentences (roughly 100-180 words). Go longer only
  if the person asks for a full or detailed reading or asks several things at
  once. Plain prose, no headings, no long bullet lists.
- Greetings (hi, hello, namaste): one warm sentence welcoming them and asking
  what they would like to know. No reading unless asked.
- Do not open with filler ("Great question!") and do not repeat the question
  back. No closing paragraph that just repeats what you said.
- Every placement, house, sign, degree and date you mention MUST come from the
  JSON above. Never invent or approximate one. If the data needed is not in the
  JSON, say so in one sentence and give what you can.
"""


MODELS = [
    os.environ.get("GEMINI_MODEL", "gemini-3.1-flash-lite"),
    os.environ.get("GEMINI_FALLBACK_MODEL", "gemini-3.5-flash"),
]
RETRYABLE = {429, 500, 503, 504}


def _config(system, with_thinking=True):
    kwargs = dict(
        system_instruction=system,
        max_output_tokens=900,
        temperature=0.2,
    )
    if with_thinking:
        kwargs["thinking_config"] = genai_types.ThinkingConfig(thinking_budget=0)
    return genai_types.GenerateContentConfig(**kwargs)


def generate_with_fallback(client, contents, system):
    last_err = None
    for model in MODELS:
        with_thinking = True
        for attempt in range(2):
            t0 = time.time()
            try:
                resp = client.models.generate_content(
                    model=model,
                    contents=contents,
                    config=_config(system, with_thinking),
                )
                print(f"[chat] {model} answered in {time.time() - t0:.1f}s")
                return resp
            except Exception as e:
                last_err = e
                code = getattr(e, "code", None)
                print(f"[chat] {model} attempt {attempt + 1} failed ({code}) after {time.time() - t0:.1f}s")
                if code == 400 and with_thinking and "thinking" in str(e).lower():
                    with_thinking = False  # model rejects thinking_budget: retry without it
                    continue
                if code not in RETRYABLE:
                    raise
                time.sleep(1)
    raise last_err


@app.post("/chat")
def chat(req: ChatRequest):
    client = get_gemini_client()

    system = SYSTEM_PROMPT.format(
        today=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        chart_json=json.dumps(req.chart, separators=(",", ":")),
        current_dasha=json.dumps(
            (req.chart.get("dasha") or {}).get("current", "not available"),
            separators=(",", ":"),
        ),
    )

    contents = []
    if req.history:
        for turn in req.history:
            role = "model" if turn.role == "assistant" else "user"
            contents.append({"role": role, "parts": [{"text": turn.content}]})
    contents.append({"role": "user", "parts": [{"text": req.question}]})

    try:
        response = generate_with_fallback(client, contents, system)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gemini API error: {e}")

    reply_text = response.text
    if not reply_text:
        raise HTTPException(
            status_code=502,
            detail="Gemini returned an empty response. Try asking again.",
        )
    return {"reply": reply_text}


# ─────────────────────────────────────────────────────────────
# Serve the built React frontend (deploy/frontend-src/build or deploy/backend/build)
# ─────────────────────────────────────────────────────────────
CURRENT_DIR = Path(__file__).resolve().parent
REPO_ROOT_BUILD = CURRENT_DIR.parent.parent / "frontend-src" / "build"
LOCAL_BACKEND_BUILD = CURRENT_DIR / "build"

# Check where the build folder lives (root repo level or copied locally to backend)
_frontend_build = None
if REPO_ROOT_BUILD.is_dir():
    _frontend_build = REPO_ROOT_BUILD
elif LOCAL_BACKEND_BUILD.is_dir():
    _frontend_build = LOCAL_BACKEND_BUILD

if _frontend_build:
    # Serve static assets (/static/js, /static/css)
    static_folder = _frontend_build / "static"
    if static_folder.is_dir():
        app.mount("/static", StaticFiles(directory=static_folder), name="static")

    # Serve direct files or fallback to index.html for client-side routing
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Prevent API paths from falling through to index.html
        if full_path.startswith("api/") or full_path in ["chart", "chat"]:
            raise HTTPException(status_code=404, detail="API endpoint not found")

        target_file = _frontend_build / full_path
        if full_path and target_file.is_file():
            return FileResponse(target_file)

        index_file = _frontend_build / "index.html"
        if index_file.is_file():
            return FileResponse(index_file)

        raise HTTPException(status_code=404, detail="index.html not found in build directory")
else:
    print(f"[startup] No frontend build found at {REPO_ROOT_BUILD} or {LOCAL_BACKEND_BUILD}. Skipping static mount.")