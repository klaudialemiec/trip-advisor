import requests
import os
import re
import json
import logging
from typing import List, Dict, Any, Optional
from youtube_transcript_api import YouTubeTranscriptApi
from openai import OpenAI

from models import Place, Coordinates
from config import (
    logger,
    YOUTUBE_API_KEY,
    OPENAI_API_KEY,
    GOOGLE_MAPS_API_KEY,
    VALID_PLACE_TYPES,
)


class YouTubeAnalyzer:
    def __init__(self):
        self.youtube_api_key = YOUTUBE_API_KEY
        self.openai_api_key = OPENAI_API_KEY
        self.google_maps_api_key = GOOGLE_MAPS_API_KEY

        # Initialize OpenAI client
        if self.openai_api_key:
            self.openai_client = OpenAI(api_key=self.openai_api_key)
        else:
            self.openai_client = None

    def extract_video_id(self, url: str) -> Optional[str]:
        """Extract video ID from YouTube URL"""
        patterns = [
            r"(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)",
            r"youtube\.com\/watch\?.*v=([^&\n?#]+)",
        ]

        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        return None

    def get_youtube_transcript(self, video_id: str) -> Optional[str]:
        """Get YouTube video transcript"""
        try:
            logger.info(f"🎬 Getting transcript for video: {video_id}")

            # Try to get transcript using youtube-transcript-api
            try:
                ytt_api = YouTubeTranscriptApi()
                transcript_list = ytt_api.list(video_id)
                transcript = transcript_list.find_transcript(
                    ["en", "pl"]
                )  # Try English first, then Polish
                transcript_data = transcript.fetch()
                full_transcript = " ".join([item.text for item in transcript_data])
                logger.info(
                    f"✅ Transcript received: {len(full_transcript)} characters"
                )
                return full_transcript
            except Exception as e:
                logger.warning(f"Could not get transcript via API: {e}")

                # Fallback: get video description via YouTube API
                if self.youtube_api_key:
                    return self._get_video_description(video_id)
                else:
                    raise Exception(
                        "No YouTube API key provided and transcript not available"
                    )

        except Exception as e:
            logger.error(f"Error getting transcript: {e}")
            raise Exception(f"Nie można pobrać transkrypcji filmu: {str(e)}")

    def analyze_with_ai(self, transcript: str) -> Dict[str, Any]:
        """Analyze transcript with OpenAI"""
        if not self.openai_client:
            logger.error("OpenAI client not initialized - check OPENAI_API_KEY")
            raise Exception("Brak klucza OpenAI API")

        if not self.openai_api_key:
            logger.error("OpenAI API key is empty or None")
            raise Exception("OpenAI API key is not configured")

        logger.info("🤖 Analyzing with AI...")

        prompt = f"""Your task is to extract places mentioned in the video transcript. Return output in JSON format:
        {{
          "places": [
            {{
              "name": "place name",
              "description": "comhrehensive description of what is worth seeing there (a few sentences)",
              "type": "one of the types: park, mountains, sea, city, lake, monument, other"
            }}
          ]
        }}

        Extract tourist places from this video transcript: {transcript}"""

        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-5-nano",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful assistant that extracts tourist places from video transcripts. Always respond with valid JSON.",
                    },
                    {"role": "user", "content": prompt},
                ],
            )

            # Log the full response for debugging
            logger.debug(f"OpenAI response: {response}")

            if not response.choices:
                raise Exception("No choices in OpenAI response")

            content = response.choices[0].message.content

            if not content:
                logger.error("Empty content received from OpenAI")
                raise Exception("No content received from OpenAI")

            logger.debug(f"OpenAI content: {content}")

            # Try to clean the content if it has markdown formatting
            if content.strip().startswith("```json"):
                content = content.strip()[7:]  # Remove ```json
            if content.strip().endswith("```"):
                content = content.strip()[:-3]  # Remove ```
            content = content.strip()

            # Parse JSON response
            analysis = json.loads(content)

            # Ensure types are valid
            if analysis.get("places"):
                for place in analysis["places"]:
                    if place.get("type") not in VALID_PLACE_TYPES:
                        place["type"] = "other"

            logger.info(
                f"✅ AI analysis completed: {len(analysis.get('places', []))} places found"
            )
            return analysis

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse OpenAI response: {e}")
            logger.error(
                f"Response content: {content if 'content' in locals() else 'No content'}"
            )
            raise Exception("Invalid response from OpenAI API")
        except Exception as e:
            logger.error(f"Error in AI analysis: {e}")
            raise

    def enrich_with_google_places(self, places: List[Dict[str, Any]]) -> List[Place]:
        """Enrich places with Google Places data"""
        if not self.google_maps_api_key:
            logger.warning(
                "No Google Maps API key - returning places without coordinates"
            )
            return [
                self._create_place_without_coordinates(place, i)
                for i, place in enumerate(places)
            ]

        logger.info("🗺️ Enriching with Google Places...")
        enriched_places = []

        for i, place in enumerate(places):
            try:
                enriched_place = self._enrich_single_place(place, i)
                if enriched_place:
                    enriched_places.append(enriched_place)
                else:
                    logger.warning(
                        f"Failed to enrich place: {place.get('name', 'unknown')}"
                    )
                    # Add place without coordinates as fallback
                    enriched_places.append(
                        self._create_place_without_coordinates(place, i)
                    )
            except Exception as e:
                logger.error(
                    f"Error enriching place {place.get('name', 'unknown')}: {e}"
                )
                # Add place without coordinates as fallback
                enriched_places.append(self._create_place_without_coordinates(place, i))

        logger.info(f"✅ Places enriched: {len(enriched_places)} places ready")
        return enriched_places

    def _enrich_single_place(
        self, place: Dict[str, Any], index: int
    ) -> Optional[Place]:
        """Enrich a single place with Google Places data"""
        place_name = place.get("name", "")
        if not place_name:
            return None

        # Use Geocoding API to get coordinates
        geocoding_url = "https://maps.googleapis.com/maps/api/geocode/json"
        params = {"address": place_name, "key": self.google_maps_api_key}

        try:
            response = requests.get(geocoding_url, params=params, timeout=10)

            # Log the response for debugging
            logger.debug(
                f"Geocoding response for '{place_name}': {response.status_code}"
            )

            if response.ok:
                data = response.json()

                # Check for API errors
                if data.get("status") != "OK":
                    logger.warning(
                        f"Geocoding API error for '{place_name}': {data.get('status')} - {data.get('error_message', 'No error message')}"
                    )
                    return None

                if data.get("results"):
                    result = data["results"][0]
                    location = result["geometry"]["location"]

                    logger.info(
                        f"✅ Found coordinates for '{place_name}': {location['lat']}, {location['lng']}"
                    )

                    google_place_id = result.get("place_id")

                    # Get photos using Places API
                    photos = self._get_place_photos(place_name, location)

                    place_id_for_frontend = (
                        google_place_id
                        or f"place_{index}_{int(location['lat'] * 1000)}"
                    )

                    return Place(
                        id=place_id_for_frontend,
                        name=place_name,
                        description=place.get("description", ""),
                        type=place.get("type", "other"),
                        coordinates=Coordinates(
                            lat=location["lat"], lng=location["lng"]
                        ),
                        google_place_id=google_place_id,
                        address=result.get("formatted_address"),
                        photos=photos,
                        photo_url=photos[0] if photos else None,
                    )
                else:
                    logger.warning(f"No geocoding results found for '{place_name}'")
                    return None
            else:
                logger.error(
                    f"HTTP error {response.status_code} for geocoding '{place_name}': {response.text}"
                )
                return None

        except requests.exceptions.Timeout:
            logger.error(f"Timeout while geocoding '{place_name}'")
            return None
        except requests.exceptions.RequestException as e:
            logger.error(f"Request error while geocoding '{place_name}': {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error while geocoding '{place_name}': {e}")
            return None

    def _get_place_photos(
        self, place_name: str, location: Dict[str, float]
    ) -> List[str]:
        """Get photos for a place using Google Places API (New)"""
        if not self.google_maps_api_key:
            logger.warning("No Google Maps API key - cannot fetch photos")
            return []

        try:
            # Use Places API (New) Text Search
            places_url = "https://places.googleapis.com/v1/places:searchText"
            headers = {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": self.google_maps_api_key,
                "X-Goog-FieldMask": "places.id,places.displayName,places.photos",
            }

            payload = {"textQuery": place_name, "maxResultCount": 1}

            logger.debug(
                f"Searching for photos for '{place_name}' using Places API (New)"
            )
            response = requests.post(
                places_url, headers=headers, json=payload, timeout=10
            )

            logger.debug(f"Places API response status: {response.status_code}")

            if response.ok:
                data = response.json()
                logger.debug(f"Places API response data: {data}")

                if data.get("places"):
                    place_result = data["places"][0]
                    photos = place_result.get("photos", [])

                    logger.info(
                        f"Found {len(photos)} photo references for '{place_name}'"
                    )

                    if photos:
                        # Get up to 10 photos
                        photo_urls = []
                        for photo in photos[:10]:
                            photo_name = photo.get("name")
                            if photo_name:
                                # Use the new photo URL format
                                photo_url = f"https://places.googleapis.com/v1/{photo_name}/media?maxWidthPx=400&key={self.google_maps_api_key}"
                                photo_urls.append(photo_url)

                        logger.info(
                            f"✅ Generated {len(photo_urls)} photo URLs for '{place_name}'"
                        )
                        return photo_urls
                    else:
                        logger.info(f"No photos found for '{place_name}'")
                        return []
                else:
                    logger.warning(f"No Places API results for '{place_name}'")
                    return []
            else:
                logger.error(
                    f"Places API HTTP error for '{place_name}': {response.status_code} - {response.text}"
                )
                return []

        except Exception as e:
            logger.error(f"Error fetching photos for '{place_name}': {e}")
            return []

    def _create_place_without_coordinates(
        self, place: Dict[str, Any], index: int
    ) -> Place:
        """Create a place without coordinates as fallback"""
        return Place(
            id=f"place_{index}",
            name=place.get("name", "Unknown"),
            description=place.get("description", ""),
            type=place.get("type", "inne"),
            coordinates=Coordinates(lat=0.0, lng=0.0),  # Default coordinates
            photos=[],
            photo_url=None,
        )

    def analyze_youtube_video(self, video_id: str) -> List[Place]:
        """Main method to analyze YouTube video and extract places"""
        logger.info(f"🎬 Analyzing YouTube video: {video_id}")

        # Step 1: Get video transcript
        logger.info("📝 Step 1: Getting video transcript...")
        transcript = self.get_youtube_transcript(video_id)
        if not transcript:
            raise Exception("Nie można pobrać transkrypcji filmu")

        # Step 2: Analyze transcript with AI
        logger.info("🤖 Step 2: Analyzing with AI...")
        analysis = self.analyze_with_ai(transcript)

        # Step 3: Enrich places with Google Places data
        logger.info("🗺️ Step 3: Enriching with Google Places...")
        places = self.enrich_with_google_places(analysis.get("places", []))

        return places

    def _get_video_description(self, video_id: str) -> Optional[str]:
        """Fallback method to get video description via YouTube API"""
        if not self.youtube_api_key:
            return None

        try:
            url = f"https://www.googleapis.com/youtube/v3/videos"
            params = {"part": "snippet", "id": video_id, "key": self.youtube_api_key}

            response = requests.get(url, params=params)
            if response.ok:
                data = response.json()
                if data.get("items"):
                    return data["items"][0]["snippet"].get("description", "")
        except Exception as e:
            logger.error(f"Error getting video description: {e}")

        return None
