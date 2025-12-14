#!/usr/bin/python3
from flask import Blueprint
app_views = Blueprint("app_views", __name__, url_prefix="/api")

from api.v1.views.landing_page import *
from api.v1.views.general_page import *
