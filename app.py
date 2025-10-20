from flask import Flask
from flask_cors import CORS

from config import logger, DEBUG, HOST, PORT
from routes import register_routes

# Create Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for frontend

# Register all routes
register_routes(app)


if __name__ == "__main__":
    logger.info("Starting Python Trip Advisor backend...")
    logger.info("Server will run on http://localhost:5000")
    app.run(debug=DEBUG, host=HOST, port=PORT)
