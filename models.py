from dataclasses import dataclass
from typing import List, Optional


@dataclass
class Coordinates:
    lat: float
    lng: float


@dataclass
class Place:
    id: str
    name: str
    description: str
    type: str
    coordinates: Coordinates
    google_place_id: Optional[str] = None
    address: Optional[str] = None
    rating: Optional[float] = None
    photo_url: Optional[str] = None
    photos: Optional[List[str]] = None
    website: Optional[str] = None


@dataclass
class YouTubeVideo:
    id: str
    title: str
    description: str
    transcript: Optional[str] = None


@dataclass
class AnalysisResult:
    places: List[Place]
    summary: str
