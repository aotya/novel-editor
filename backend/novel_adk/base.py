import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

# 環境変数を読み込む
load_dotenv()

class Agent:
    def __init__(self, model: str, name: str, description: str, instruction: str):
        self.model_name = model
        self.name = name
        self.description = description
        self.instruction = instruction
        
        # APIキーの取得
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY is not set")

        # クライアントの初期化
        self.client = genai.Client(api_key=api_key)

    def generate_response(self, prompt: str) -> str:
        """
        ユーザーのプロンプトを受け取り、AIの応答を生成して返します。
        """
        try:
            # 新しいSDKでの呼び出し
            # configでシステムプロンプトを設定
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=self.instruction
                )
            )
            return response.text
        except Exception as e:
            # エラー内容を明確にするために再送出
            raise e

