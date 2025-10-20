import os
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# API Keys
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

# Log API key status (without exposing the actual keys)
logger.info(
    f"API Keys loaded - YouTube: {'✓' if YOUTUBE_API_KEY else '✗'}, OpenAI: {'✓' if OPENAI_API_KEY else '✗'}, Google Maps: {'✓' if GOOGLE_MAPS_API_KEY else '✗'}"
)

# Flask Configuration
DEBUG = True
HOST = "0.0.0.0"
PORT = 5000

# Valid place types
VALID_PLACE_TYPES = [
    "park",
    "mountains",
    "sea",
    "city",
    "lake",
    "monument",
    "other",
]
