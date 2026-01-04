from fastapi import FastAPI, HTTPException, Depends, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import sys
import os
import json
import jwt
import requests
from dotenv import load_dotenv

# 環境変数の読み込み
# novel_adk/.env も読み込むように設定
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), "novel_adk", ".env"))

# Supabaseの設定
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
if not SUPABASE_URL:
    # フォールバック（プロジェクトURLが設定されていない場合）
    print("WARNING: NEXT_PUBLIC_SUPABASE_URL is not set!")

JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json" if SUPABASE_URL else None

# JWKクライアントの初期化（鍵を自動取得・キャッシュ）
jwks_client = jwt.PyJWKClient(JWKS_URL) if JWKS_URL else None

# パスを通す（必要に応じて）
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from novel_adk.agent import root_agent
from novel_adk.proofreader import proofreader_agent
from novel_adk.rewriter import rewriter_agent
from novel_adk.story_generator import story_generator_agent

app = FastAPI(title="Novel Editor API")

# セキュリティ設定
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    """
    SupabaseのJWTトークンを検証し、ユーザー情報を取得します。
    JWKSを使用して公開鍵を自動取得します。
    """
    if not jwks_client:
        print("DEBUG: JWK Client is not initialized (check NEXT_PUBLIC_SUPABASE_URL)")
        raise HTTPException(status_code=500, detail="Supabase URL is not configured")

    token = credentials.credentials
    try:
        # デバッグ用: トークンのヘッダーを確認
        header = jwt.get_unverified_header(token)
        print(f"DEBUG: JWT Header: {header}")

        # Supabaseの公開鍵セットから適切な鍵を取得
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        # トークンのデコードと検証
        payload = jwt.decode(
            token, 
            signing_key.key, 
            algorithms=["HS256", "ES256"], 
            options={"verify_aud": False}
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            print("DEBUG: Token missing 'sub' claim")
            raise HTTPException(status_code=401, detail="Invalid token: missing sub claim")
        return payload
    except Exception as e:
        print(f"DEBUG: JWT Validation Error: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=401, detail=f"Could not validate credentials: {str(e)}")

# CORS設定（フロントエンドからのアクセスを許可）
# 本番環境では特定のオリジンのみを許可するように設定
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    # 公開後の本番URLをここに追加してください (例: "https://your-novel-app.vercel.app")
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class EditRequest(BaseModel):
    content: str

# Rewrite API用のデータモデル
class RewriteSelectionRange(BaseModel):
    start: int
    end: int

class RewriteContext(BaseModel):
    chapterTitle: Optional[str] = None
    characters: Optional[List[str]] = None
    mood: Optional[str] = None
    # その他任意のコンテキストを受け取れるように拡張性を確保
    extra: Optional[Dict[str, Any]] = None

class RewriteData(BaseModel):
    fullText: str
    selectedText: str
    selectionRange: Optional[RewriteSelectionRange] = None
    instruction: str
    context: Optional[RewriteContext] = None

class RewriteRequest(BaseModel):
    mode: str = "rewrite"
    data: RewriteData

# Story Generation API用のデータモデル
class StoryGenReferences(BaseModel):
    correlationMap: Optional[List[Any]] = None
    plot: Optional[List[Any]] = None
    relationMap: Optional[List[Any]] = None

class StoryGenConfig(BaseModel):
    targetLength: int
    perspective: str
    style: str = "novel"
    instruction: Optional[str] = None

class StoryGenData(BaseModel):
    title: str
    overview: str
    references: StoryGenReferences
    baseContent: Optional[str] = None
    config: StoryGenConfig

class StoryGenRequest(BaseModel):
    mode: str = "story-gen"
    model: str = "gemini-2.5-flash"
    data: StoryGenData

@app.get("/")
def read_root():
    return {"message": "Novel Editor API is running. Send POST request to /api/edit, /api/proofread, /api/rewrite or /api/generate-story"}

@app.post("/api/edit")
def edit_novel(request: EditRequest, user=Depends(get_current_user)):
    """
    小説の本文やプロットを受け取り、エージェントからのアドバイスを返します。
    """
    try:
        # エージェントを使って応答を生成
        response = root_agent.generate_response(request.content)
        return {"advice": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/proofread")
def proofread_novel(request: EditRequest, user=Depends(get_current_user)):
    """
    小説の本文を受け取り、誤字脱字の指摘をJSON形式で返します。
    """
    try:
        # エージェントを使って応答を生成
        raw_response = proofreader_agent.generate_response(request.content)
        
        # JSONクリーニングとパース
        return parse_json_response(raw_response)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/rewrite")
def rewrite_novel(request: RewriteRequest, user=Depends(get_current_user)):
    """
    選択範囲のテキストを指示に従ってリライトします。
    """
    try:
        # AIへのプロンプトを作成
        # JSON形式でデータを渡すことで構造的に理解させる
        prompt_data = request.data.model_dump()
        prompt = json.dumps(prompt_data, ensure_ascii=False, indent=2)
        
        # エージェントを使って応答を生成
        raw_response = rewriter_agent.generate_response(prompt)
        
        # JSONクリーニングとパース
        return parse_json_response(raw_response)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-story")
def generate_story(request: StoryGenRequest, user=Depends(get_current_user)):
    """
    小説の設定データに基づき、短編小説を生成します。
    """
    try:
        # AIへのプロンプトを作成
        prompt_data = request.data.model_dump()
        prompt = json.dumps(prompt_data, ensure_ascii=False, indent=2)
        
        # エージェントを使って応答を生成
        raw_response = story_generator_agent.generate_response(prompt)
        
        # JSONクリーニングとパース
        return parse_json_response(raw_response)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def parse_json_response(raw_response: str):
    """
    AIからの応答（文字列）をJSONとしてパースするヘルパー関数
    """
    # 簡単なクリーニング
    cleaned_response = raw_response.strip()
    if cleaned_response.startswith("```json"):
        cleaned_response = cleaned_response[7:]
    if cleaned_response.startswith("```"):
        cleaned_response = cleaned_response[3:]
    if cleaned_response.endswith("```"):
        cleaned_response = cleaned_response[:-3]
    
    try:
        json_response = json.loads(cleaned_response)
        return json_response
    except json.JSONDecodeError:
        print(f"Failed to parse JSON: {raw_response}")
        raise HTTPException(status_code=500, detail="AI response was not valid JSON")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
