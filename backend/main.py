import os
import sys
import logging

# ロギング設定の初期化
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("uvicorn")

try:
    from fastapi import FastAPI, HTTPException, Depends, Security
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
    from pydantic import BaseModel
    from typing import List, Optional, Dict, Any
    import json
    import jwt
    import requests
    import re
    from dotenv import load_dotenv
    
    # 環境変数の読み込み
    load_dotenv()
    
    # Supabaseの設定
    SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    if not SUPABASE_URL:
        # フォールバック（プロジェクトURLが設定されていない場合）
        logger.warning("WARNING: NEXT_PUBLIC_SUPABASE_URL is not set!")
    
    JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json" if SUPABASE_URL else None
    
    # JWKクライアントの初期化（鍵を自動取得・キャッシュ）
    # 初期化時に通信は発生しないため、URLがNoneでもここではエラーにならないはず
    jwks_client = jwt.PyJWKClient(JWKS_URL) if JWKS_URL else None
    
    # パスを通す（必要に応じて）
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    
    from novel_adk.agent import root_agent
    from novel_adk.proofreader import proofreader_agent
    from novel_adk.rewriter import rewriter_agent
    from novel_adk.story_generator import story_generator_agent
    from novel_adk.long_story_generator import long_story_generator_agent
    
    # docs_url, redoc_url を環境変数で制御 (本番環境では None にして無効化推奨)
    ENABLE_DOCS = os.getenv("ENABLE_DOCS", "false").lower() == "true"
    app = FastAPI(
        title="Novel Editor API",
        docs_url="/docs" if ENABLE_DOCS else None,
        redoc_url="/redoc" if ENABLE_DOCS else None,
        openapi_url="/openapi.json" if ENABLE_DOCS else None
    )
    
    # セキュリティ設定
    security = HTTPBearer()
    
    async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
        """
        SupabaseのJWTトークンを検証し、ユーザー情報を取得します。
        JWKSを使用して公開鍵を自動取得します。
        """
        if not jwks_client:
            logger.debug("DEBUG: JWK Client is not initialized (check NEXT_PUBLIC_SUPABASE_URL)")
            raise HTTPException(status_code=500, detail="Supabase URL is not configured")
    
        token = credentials.credentials
        try:
            # デバッグ用: トークンのヘッダーを確認
            header = jwt.get_unverified_header(token)
            logger.debug(f"DEBUG: JWT Header: {header}")
    
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
                logger.debug("DEBUG: Token missing 'sub' claim")
                raise HTTPException(status_code=401, detail="Invalid token: missing sub claim")
            return payload
        except Exception as e:
            logger.debug(f"DEBUG: JWT Validation Error: {type(e).__name__}: {str(e)}")
            raise HTTPException(status_code=401, detail=f"Could not validate credentials: {str(e)}")
    
    # CORS設定（フロントエンドからのアクセスを許可）
    # 本番環境では特定のオリジンのみを許可するように設定
    allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
    ALLOWED_ORIGINS = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        # 環境変数から追加のオリジンを読み込む
        *filter(None, allowed_origins_env.split(","))
    ]
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # リクエストモデル
    class EditRequest(BaseModel):
        content: str
    
    class RewriteRequest(BaseModel):
        data: Dict[str, Any]
    
    class StoryGenRequest(BaseModel):
        data: Dict[str, Any]
    
    @app.get("/")
    def read_root():
        # ヘルスチェック用エンドポイント
        # セキュリティのため、詳細な情報は返さない
        return {"status": "ok"}
    
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
            # request.data は辞書型なのでそのまま使用する (.model_dump()は不要)
            prompt_data = request.data
            prompt = json.dumps(prompt_data, ensure_ascii=False, indent=2)
            
            # エージェントを使って応答を生成
            raw_response = rewriter_agent.generate_response(prompt)
            
            # JSONクリーニングとパース
            return parse_json_response(raw_response)

        except Exception as e:
            # エラー詳細をログに出力
            logger.error(f"Error in rewrite_novel: {e}")
            import traceback
            logger.error(traceback.format_exc())
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.post("/api/generate-story")
    def generate_story(request: StoryGenRequest, user=Depends(get_current_user)):
        """
        小説の設定データに基づき、短編小説を生成します。
        """
        try:
            # AIへのプロンプトを作成
            prompt_data = request.data
            prompt = json.dumps(prompt_data, ensure_ascii=False, indent=2)
            
            # エージェントを使って応答を生成
            raw_response = story_generator_agent.generate_response(prompt)
            
            # JSONクリーニングとパース
            return parse_json_response(raw_response)

        except Exception as e:
            logger.error(f"Error in generate_story: {e}")
            import traceback
            logger.error(traceback.format_exc())
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/api/generate-long-story")
    def generate_long_story(request: StoryGenRequest, user=Depends(get_current_user)):
        """
        小説の設定データとこれまでの文脈に基づき、長編小説の続きを生成します。
        """
        try:
            # AIへのプロンプトを作成
            prompt_data = request.data
            prompt = json.dumps(prompt_data, ensure_ascii=False, indent=2)
            
            # エージェントを使って応答を生成
            raw_response = long_story_generator_agent.generate_response(prompt)
            
            # JSONクリーニングとパース
            return parse_json_response(raw_response)

        except Exception as e:
            logger.error(f"Error in generate_long_story: {e}")
            import traceback
            logger.error(traceback.format_exc())
            raise HTTPException(status_code=500, detail=str(e))
    
    def parse_json_response(raw_response: str):
        """
        AIからの応答（文字列）からJSON部分を抽出してパースするヘルパー関数
        """
        # 正規表現で ```json { ... } ``` または単に { ... } の部分を抽出
        json_match = re.search(r'(\{[\s\S]*\}|\[[\s\S]*\])', raw_response)
        if json_match:
            cleaned_response = json_match.group(1)
        else:
            cleaned_response = raw_response.strip()
    
        try:
            json_response = json.loads(cleaned_response)
            return json_response
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {raw_response}")
            logger.error(f"Error details: {str(e)}")
            raise HTTPException(status_code=500, detail=f"AI response was not valid JSON: {str(e)}")

except Exception as e:
    logger.error(f"Failed to start application: {e}")
    # スタックトレースを表示
    import traceback
    traceback.print_exc()
    # 起動エラーでもコンテナを即終了させず、ダミーアプリを起動してエラーログを見れるようにする（デバッグ用）
    # 本番では良くないが、原因究明のため
    app = FastAPI()
    @app.get("/")
    def read_root():
        return {"status": "error", "detail": str(e)}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
