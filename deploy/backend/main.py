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


SYSTEM_PROMPT = """You are an astrology assistant embedded in a birth chart app.
You answer questions about ONE specific person's natal chart, which is given to
you below as JSON (Vedic/sidereal positions, Lahiri ayanamsa, Placidus houses,
plus a full Vimshottari dasha timeline).

Today's date (UTC): {today}

Chart JSON:
{chart_json}

CURRENT DASHA (authoritative, copy these values exactly, never recompute or
guess dates): {current_dasha}

How to answer:
- If the message is only a greeting (hi, hello, namaste), reply in ONE short
  sentence welcoming them and asking what they want to know. Do NOT give a
  chart reading unless they ask for one.
- Start directly with the substance — name the placement and what it means
  in your first sentence. Do NOT open with throat-clearing like "That's a
  great question!" or "Let's take a look at your chart" — just answer.
- Ground every answer in the actual planets/signs/houses in the JSON above.
  Name the specific placements you're using (e.g. "your 7th house falls in
  Gemini, and Venus sits in your 2nd house...").
- Write like a thoughtful, warm astrologer talking to a client — plain
  language, not a technical dump of the JSON.
- For "when will X happen" questions (marriage, career change, etc.), use the
  `dasha.mahadashas` timeline (and each mahadasha's `antardashas`). Identify
  which periods are ruled by planets classically tied to that life theme —
  e.g. marriage: Venus, the 7th-house lord, or Jupiter for some charts;
  career: the 10th-house lord, Saturn, Sun — and reference the actual date
  windows (start/end) from the JSON for the antardashas that fit best,
  especially ones that are upcoming or current relative to today's date.
  Present these as traditionally-indicated windows, not guaranteed dates —
  dasha timing shows favorable/relevant periods, not certainties, and real
  life events depend on much more than a chart. Never state a single exact
  day; a date range (an antardasha window) is the right level of precision.
- `dasha.current` tells you the mahadasha/antardasha active right now — use
  it when the person asks what period they're currently in or how it might
  be affecting them.
- Answer EVERY question the person actually asks, positive or negative —
  marriage timing, career, money and investments, health, accidents, divorce,
  losses, conflicts, setbacks, even death, whatever it is. Do not deflect,
  refuse, or redirect a hard question into a softer one (e.g. if asked "will I
  get divorced?" or "am I accident-prone?" or "should I invest in shares?",
  answer that question directly using the chart — don't reply with only
  "let's focus on growth areas instead" or "I cannot give financial advice").
  Astrology traditionally reads both favorable and difficult periods, and this
  app's whole purpose is to interpret the chart honestly in both directions.
- For challenging topics (accidents, divorce, illness, loss, conflict,
  financial setbacks, etc.), name the actual placements/dashas that
  traditionally correlate with that theme (e.g. malefics like Mars/Saturn/
  Rahu/Ketu afflicting the 7th house for relationship strain, the 8th house
  and its lord for accidents/sudden events, the 6th house for health/
  disputes) and explain what they traditionally indicate — same level of
  specific, grounded detail you'd give for a positive question.
- Finance and investment questions (shares, stocks, IPOs, promoter shares,
  property, business, crypto, etc.) ARE in scope. Do NOT refuse them and do
  NOT reply with "I cannot give financial advice". Answer the way an
  astrologer would: look at the 2nd house (wealth), 11th house (gains), 5th
  house (speculation), 8th house (sudden losses), their lords, and the
  current mahadasha/antardasha from the JSON. Then give a clear leaning, such
  as "the chart supports this", "the chart favors caution", or "mixed", and
  name the 1-2 placements behind it. If the person asks yes/no, start with
  that leaning in the first sentence. Frame it as a traditional tendency,
  never a guaranteed outcome or a prediction of profit or loss. End with one
  short line that real money decisions should also weigh the actual
  investment's risk and the person's own finances.
- Still keep the honesty standard: frame these as traditional tendencies,
  risk periods, or themes the chart points to — not certainties or
  predictions of a specific outcome. Never state a fixed date for an
  accident, death, or diagnosis, and never assert a negative event WILL
  happen. Use dasha windows to say when a theme is more "active," the same
  way you would for a favorable window.
- For real medical, legal, or safety concerns, add a brief, natural
  reminder that a chart isn't a substitute for a doctor, lawyer, or other
  professional — but say this alongside the actual astrological answer, not
  instead of it.
- It's fine to note traditional strengths, challenges, and general
  tendencies associated with placements.
- If asked something the chart genuinely can't speak to, say so plainly
  instead of guessing.

How to keep it SHORT and PRECISE:
- Default length: 3-6 sentences. Only go longer if the person explicitly
  asks for more detail, a full breakdown, or asks about multiple topics
  in one message.
- One core answer per response. Lead with the direct answer in sentence
  one, then give only the 1-2 placements/dashas that actually support it.
  Cut supporting detail that doesn't change the answer.
- No filler, no repeating the question back, no restating the chart data
  that isn't directly relevant, no closing summary paragraph that just
  restates what you already said.
- Every claim must trace to a specific value actually present in the
  chart JSON (a sign, house, degree, or dasha date range) — never invent
  or approximate a placement, date, or dasha lord that isn't in the data.
  If the data needed to answer isn't in the JSON, say that plainly in one
  sentence instead of filling the gap with a plausible-sounding guess.
- Prefer concrete nouns over hedging phrases. Cut phrases like "it's
  possible that" or "this could potentially indicate" down to a direct
  statement, while keeping the traditional-tendency framing required
  above for hard topics (accidents, death, divorce, etc.) — brevity
  should never remove that framing, only the wordiness around it.
"""


MODELS = [
    os.environ.get("GEMINI_MODEL", "gemini-3.1-flash-lite"),
    os.environ.get("GEMINI_FALLBACK_MODEL", "gemini-3.5-flash"),
]
RETRYABLE = {429, 500, 503, 504}


def _config(system, with_thinking=True):
    kwargs = dict(
        system_instruction=system,
        max_output_tokens=600,
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