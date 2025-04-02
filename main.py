# main.py
import os
import random
import re
import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
# Optional: Use python-dotenv for local development to load .env file
from dotenv import load_dotenv
load_dotenv()

# --- Configuration ---
try:
    # Attempt to load API key from environment variable
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY environment variable not set.")
    genai.configure(api_key=api_key)
except Exception as e:
    print(f"Error configuring Gemini API: {e}")
    # Exit or handle appropriately if API key is essential
    exit()

# Set up the Gemini model
model = genai.GenerativeModel('gemini-1.5-flash')

# Import obstacle list
try:
    from obstacles import OBSTACLE_LIST
    if not OBSTACLE_LIST:
        raise ValueError("Obstacle list is empty.")
except ImportError:
    print("Error: obstacles.py not found or OBSTACLE_LIST not defined.")
    # Provide a default list or exit
    OBSTACLE_LIST = ["Default Obstacle"]
except ValueError as e:
    print(f"Error with obstacle list: {e}")
    OBSTACLE_LIST = ["Default Obstacle"]


# --- FastAPI App Setup ---
app = FastAPI()

# Configure CORS
origins = [
    "http://localhost",        # Allow local development server if you use one
    "http://127.0.0.1",
    "null",                    # Allow file:// origins (opening HTML directly)
    # Add any other origins if deploying frontend elsewhere
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)

# --- Pydantic Models (for request/response validation) ---
class ObstacleResponse(BaseModel):
    obstacle: str

class ValidateRequest(BaseModel):
    obstacle: str
    response: str

class ValidateResponse(BaseModel):
    valid: bool
    explanation: str | None = None

# --- Helper Function for Parsing Gemini Response ---
def parse_gemini_response(text: str) -> tuple[bool, str | None]:
    """
    Parses the Gemini response text to extract Yes/No and the explanation.
    Expects format like: "Yes/No. Explanation text..."
    """
    text_lower = text.strip().lower()
    valid = False
    explanation = None

    # Simple check for starting with "yes" or "no"
    if text_lower.startswith("yes"):
        valid = True
    elif text_lower.startswith("no"):
        valid = False
    else:
        # If it doesn't start clearly, assume invalid and use the whole text as explanation
        return False, text.strip()

    # Try to find the explanation part
    # Look for the first sentence terminator or significant punctuation after yes/no
    match = re.search(r"^(yes|no)[\.\!\?\s](.)", text, re.IGNORECASE | re.DOTALL)
    if match:
        explanation = match.group(2).strip()
        if not explanation: # Handle cases like just "Yes."
             explanation = "No specific explanation provided."
    else:
         # Fallback if regex fails but started with yes/no
        explanation = text.strip() # Use the whole text as explanation

    # Ensure there's always some explanation text returned if possible
    if not explanation:
        explanation = "No explanation provided."

    return valid, explanation


# --- API Endpoints ---
@app.get("/get-obstacle", response_model=ObstacleResponse)
async def get_obstacle():
    """Provides a random obstacle from the list."""
    if not OBSTACLE_LIST:
        raise HTTPException(status_code=500, detail="Obstacle list is not available.")
    chosen_obstacle = random.choice(OBSTACLE_LIST)
    return {"obstacle": chosen_obstacle}

@app.post("/validate-response", response_model=ValidateResponse)
async def validate_response(request: ValidateRequest):
    """Validates a user's response against an obstacle using Gemini."""
    obstacle = request.obstacle
    user_response = request.response

    if not obstacle or not user_response:
        raise HTTPException(status_code=400, detail="Obstacle and response must be provided.")

    prompt = f"Does \"{user_response}\" logically defeat \"{obstacle}\"? Reply first with only Yes or No. Then, reply with a brief explanation."

    try:
        # print(f"Sending prompt to Gemini: {prompt}") # Debugging
        response = model.generate_content(prompt)
        # print(f"Raw Gemini Response: {response.text}") # Debugging

        valid, explanation = parse_gemini_response(response.text)

        # print(f"Parsed Result - Valid: {valid}, Explanation: {explanation}") # Debugging
        return {"valid": valid, "explanation": explanation}

    except Exception as e:
        print(f"Error during Gemini API call or parsing: {e}")
        # Return a generic error response to the frontend
        raise HTTPException(status_code=500, detail=f"AI validation failed: {e}")


# --- Main entry point for running with Uvicorn ---
if __name__ == "_main_":
    import uvicorn
    # Run on 0.0.0.0 to be accessible from other devices on the network if needed
    # Use port 8000 by convention
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)