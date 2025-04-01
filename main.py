from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import random
import google.generativeai as genai
import os

app = FastAPI()

# Configure Gemini API
os.environ["GEMINI_API_KEY"] = "AIzaSyBZDzFGYLFlMkIVq3YyaFBVMYatUVbSoYE"
genai.configure(api_key=os.environ["GEMINI_API_KEY"])

OBSTACLES = ["fire", "water", "earth", "wind", "lightning", "ice"]

class PlayerResponse(BaseModel):
    obstacle: str
    answer: str

@app.get("/generate-obstacle")
def generate_obstacle():
    """Returns a random obstacle."""
    return {"obstacle": random.choice(OBSTACLES)}

@app.post("/validate-response")
def validate_response(response: PlayerResponse):
    """Validates the player's response with Gemini AI."""
    model = genai.GenerativeModel("gemini-pro")
    prompt = f"Given the obstacle '{response.obstacle}', does '{response.answer}' counter it? Answer with 'yes' or 'no'."
    
    try:
        result = model.generate_content(prompt)
        is_correct = "yes" in result.text.lower()
        return {"valid": is_correct, "ai_response": result.text.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
