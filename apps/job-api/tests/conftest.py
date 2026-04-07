from app.seed.keyword_config import keyword_config


import pytest


@pytest.fixture
def config():
    return keyword_config
