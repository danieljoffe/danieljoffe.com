import pytest

from app.seed.keyword_config import keyword_config


@pytest.fixture
def config():
    return keyword_config
