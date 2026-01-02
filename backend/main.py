from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sys
import os

# パスを通す（必要に応じて）
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from novel_adk.agent import root_agent

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

@app.get("/")
def read_root():
    return {"message": "Novel Editor API is running. Send POST request to /api/edit"}

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

