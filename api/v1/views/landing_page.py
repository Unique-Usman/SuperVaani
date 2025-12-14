#!/usr/bin/python3
"""
Deals with the RESTful API action(s) of the landing page
"""
from api.v1.views import app_views
from flask import jsonify, request


@app_views.route("/home", strict_slashes=False)
def landing_page():
    """
    Fetches the necessary data to render the landing page
    """
    return jsonify({"SuperVaani": "Plaksha"}), 200
