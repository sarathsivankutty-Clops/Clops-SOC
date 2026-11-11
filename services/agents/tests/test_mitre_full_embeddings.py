from __future__ import annotations

import json
from types import SimpleNamespace

import httpx
import pytest
from qdrant_client.http.exceptions import UnexpectedResponse

from app.tools import mitre_full


@pytest.mark.asyncio
async def test_embed_texts_uses_local_ollama_api():
    observed: dict[str, object] = {}

    def handle(request: httpx.Request) -> httpx.Response:
        observed["url"] = str(request.url)
        observed["body"] = json.loads(request.content)
        return httpx.Response(200, json={"embeddings": [[0.1, 0.2], [0.3, 0.4]]})

    async with httpx.AsyncClient(transport=httpx.MockTransport(handle)) as client:
        vectors = await mitre_full._embed_texts(
            ["technique one", "technique two"],
            client=client,
            base_url="http://ollama:11434/",
            model="nomic-embed-text",
        )

    assert observed == {
        "url": "http://ollama:11434/api/embed",
        "body": {"model": "nomic-embed-text", "input": ["technique one", "technique two"]},
    }
    assert vectors == [[0.1, 0.2], [0.3, 0.4]]


@pytest.mark.asyncio
async def test_embed_texts_rejects_an_unexpected_embedding_count():
    def handle(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"embeddings": [[0.1, 0.2]]})

    async with httpx.AsyncClient(transport=httpx.MockTransport(handle)) as client:
        with pytest.raises(ValueError, match="embedding count"):
            await mitre_full._embed_texts(["first", "second"], client=client, base_url="http://ollama:11434")


@pytest.mark.asyncio
async def test_attck_collection_rebuilds_when_embedding_dimensions_change():
    class FakeQdrant:
        def __init__(self):
            self.exists = True
            self.deleted = False
            self.created = None

        async def get_collection(self, collection):
            assert collection == "attck_techniques"
            if not self.exists:
                response = httpx.Response(
                    404,
                    request=httpx.Request("GET", f"http://qdrant/collections/{collection}"),
                )
                raise UnexpectedResponse.for_response(response)
            return SimpleNamespace(config=SimpleNamespace(params=SimpleNamespace(vectors=SimpleNamespace(size=3072))))

        async def delete_collection(self, collection):
            assert collection == "attck_techniques"
            self.deleted = True
            self.exists = False

        async def create_collection(self, **kwargs):
            self.created = kwargs
            self.exists = True

    qdrant = FakeQdrant()
    await mitre_full._ensure_attck_collection(qdrant, "attck_techniques", 768)

    assert qdrant.deleted
    assert qdrant.created["collection_name"] == "attck_techniques"
    assert qdrant.created["vectors_config"].size == 768


@pytest.mark.asyncio
async def test_attck_collection_is_created_when_missing():
    class FakeQdrant:
        async def get_collection(self, collection):
            response = httpx.Response(
                404,
                request=httpx.Request("GET", f"http://qdrant/collections/{collection}"),
            )
            raise UnexpectedResponse.for_response(response)

        async def create_collection(self, **kwargs):
            self.created = kwargs

    qdrant = FakeQdrant()
    await mitre_full._ensure_attck_collection(qdrant, "attck_techniques", 768)

    assert qdrant.created["collection_name"] == "attck_techniques"
    assert qdrant.created["vectors_config"].size == 768


@pytest.mark.asyncio
async def test_semantic_search_uses_qdrant_rest_search_endpoint(monkeypatch):
    observed: dict[str, object] = {}

    async def fake_embed(_texts, **_kwargs):
        return [[0.1, 0.2]]

    def handle(request: httpx.Request) -> httpx.Response:
        observed["url"] = str(request.url)
        observed["body"] = json.loads(request.content)
        return httpx.Response(
            200,
            json={
                "result": [
                    {
                        "payload": {
                            "technique_id": "T1059",
                            "name": "Command and Scripting Interpreter",
                            "tactic_names": ["Execution"],
                            "url": "https://attack.mitre.org/techniques/T1059/",
                        },
                        "score": 0.91,
                    }
                ]
            },
        )

    monkeypatch.setattr(mitre_full, "_embed_texts", fake_embed)
    async with httpx.AsyncClient(transport=httpx.MockTransport(handle)) as client:
        results = await mitre_full.semantic_technique_search(
            "PowerShell execution",
            "http://qdrant:6333/",
            client=client,
        )

    assert observed == {
        "url": "http://qdrant:6333/collections/attck_techniques/points/search",
        "body": {"vector": [0.1, 0.2], "limit": 5, "with_payload": True},
    }
    assert results[0]["technique_id"] == "T1059"
    assert results[0]["score"] == 0.91


def test_technique_point_id_is_stable():
    assert mitre_full._technique_point_id("T1059.001") == mitre_full._technique_point_id("T1059.001")
