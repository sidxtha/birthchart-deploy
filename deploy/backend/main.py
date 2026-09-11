import os
import json
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
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
@app.get("/")
def root():
    return {"status": "Birth Chart API is running!"}


# ─────────────────────────────────────────────────────────────
# Chatbot: ask questions about a previously-generated chart
# ─────────────────────────────────────────────────────────────

_gemini_client = None


def get_gemini_client():
    """Lazily create the Gemini client so a missing API key doesn't crash
    the whole server on startup — only the /chat endpoint. Uses Google's
    free-tier Gemini API (get a key at https://aistudio.google.com/apikey —
    no credit card required)."""
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

How to answer:
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
  marriage timing, career, health, accidents, divorce, losses, conflicts,
  setbacks, even death, whatever it is. Do not deflect, refuse, or redirect a hard
  question into a softer one (e.g. if asked "will I get divorced?" or "am I
  accident-prone?", answer that question directly using the chart — don't
  reply with only "let's focus on growth areas instead"). Astrology
  traditionally reads both favorable and difficult periods, and this app's
  whole purpose is to interpret the chart honestly in both directions.
- For challenging topics (accidents, divorce, illness, loss, conflict,
  financial setbacks, etc.), name the actual placements/dashas that
  traditionally correlate with that theme (e.g. malefics like Mars/Saturn/
  Rahu/Ketu afflicting the 7th house for relationship strain, the 8th house
  and its lord for accidents/sudden events, the 6th house for health/
  disputes) and explain what they traditionally indicate — same level of
  specific, grounded detail you'd give for a positive question.
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
- Keep responses conversational and focused — a few short paragraphs, not
  an essay, unless the person asks for more depth.

"""


@app.post("/chat")
def chat(req: ChatRequest):
    client = get_gemini_client()

    system = SYSTEM_PROMPT.format(
        today=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        chart_json=json.dumps(req.chart, indent=2),
    )

    # Gemini uses "model" instead of "assistant" for the AI's turns.
    contents = []
    if req.history:
        for turn in req.history:
            role = "model" if turn.role == "assistant" else "user"
            contents.append({"role": role, "parts": [{"text": turn.content}]})
    contents.append({"role": "user", "parts": [{"text": req.question}]})

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
            config=genai_types.GenerateContentConfig(
                system_instruction=system,
                max_output_tokens=2048,
                # Gemini 2.5 Flash spends part of max_output_tokens on hidden
                # "thinking" tokens before writing the visible reply. Left
                # unset, thinking can consume the whole budget and leave the
                # actual answer truncated/empty. Disabling it here keeps all
                # tokens for the reply itself, which is all this app needs.
                thinking_config=genai_types.ThinkingConfig(thinking_budget=0),
            ),
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gemini API error: {e}")

    reply_text = response.text
    if not reply_text:
        raise HTTPException(
            status_code=502,
            detail="Gemini returned an empty response. Try asking again.",
        )
    return {"reply": reply_text}