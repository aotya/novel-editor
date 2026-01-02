from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import sys
import os
import json

# パスを通す（必要に応じて）
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from novel_adk.agent import root_agent
from novel_adk.proofreader import proofreader_agent
from novel_adk.rewriter import rewriter_agent

app = FastAPI(title="Novel Editor API")

# CORS設定（フロントエンドからのアクセスを許可）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 開発環境なので全許可。本番ではフロントエンドのURLを指定してください
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

@app.get("/")
def read_root():
    return {"message": "Novel Editor API is running. Send POST request to /api/edit, /api/proofread or /api/rewrite"}

@app.post("/api/edit")
def edit_novel(request: EditRequest):
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
def proofread_novel(request: EditRequest):
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
def rewrite_novel(request: RewriteRequest):
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
