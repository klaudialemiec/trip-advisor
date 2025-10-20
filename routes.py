from flask import request, jsonify, render_template
from dataclasses import asdict
import logging
import os

from analyzer import YouTubeAnalyzer
from config import logger, GOOGLE_MAPS_API_KEY

# Initialize analyzer
analyzer = YouTubeAnalyzer()


def register_routes(app):
    """Register all routes with the Flask app"""

    @app.route("/")
    def index():
        """Serve the main page"""
        return render_template(
            "index.html", google_maps_api_key=GOOGLE_MAPS_API_KEY or ""
        )

    @app.route("/api/analyze", methods=["POST"])
    def analyze_video():
        """Analyze YouTube video and extract places"""
        try:
            data = request.get_json()
            video_url = data.get("video_url")

            if not video_url:
                return jsonify({"error": "Video URL is required"}), 400

            # Extract video ID
            video_id = analyzer.extract_video_id(video_url)
            if not video_id:
                return jsonify({"error": "Invalid YouTube URL"}), 400

            # Analyze video
            places = analyzer.analyze_youtube_video(video_id)

            # Convert to dict format for JSON response
            places_dict = []
            for place in places:
                place_dict = asdict(place)
                places_dict.append(place_dict)

            return jsonify(
                {"success": True, "places": places_dict, "video_id": video_id}
            )

        except Exception as e:
            logger.error(f"Error analyzing video: {e}")
            return jsonify({"error": str(e)}), 500

    @app.route("/api/transcript", methods=["POST"])
    def get_transcript():
        """Get YouTube video transcript (legacy endpoint)"""
        try:
            data = request.get_json()
            video_url = data.get("video_url")

            if not video_url:
                return jsonify({"error": "Video URL is required"}), 400

            # Extract video ID from URL
            video_id = analyzer.extract_video_id(video_url)
            if not video_id:
                return jsonify({"error": "Invalid YouTube URL"}), 400

            # Get transcript
            transcript = analyzer.get_youtube_transcript(video_id)

            return jsonify(
                {"video_id": video_id, "transcript": transcript, "success": True}
            )

        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/health", methods=["GET"])
    def health_check():
        """Health check endpoint"""
        return jsonify(
            {
                "status": "OK",
                "message": "Python Trip Advisor backend is running",
                "apis": {
                    "youtube": bool(analyzer.youtube_api_key),
                    "openai": bool(analyzer.openai_api_key),
                    "google_maps": bool(analyzer.google_maps_api_key),
                },
            }
        )
