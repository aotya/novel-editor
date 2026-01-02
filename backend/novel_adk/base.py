import os
import google.generativeai as genai
from dotenv import load_dotenv

# 環境変数を読み込む
load_dotenv()

# APIキーの設定
api_key = os.getenv("GOOGLE_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

class Agent:
    def __init__(self, model: str, name: str, description: str, instruction: str):
        self.model_name = model
        self.name = name
        self.description = description
        self.instruction = instruction
        
        # モデルの初期化
        # system_instructionとしてinstructionを渡す
        self.model = genai.GenerativeModel(
            model_name=model,
            system_instruction=instruction
        )

    def generate_response(self, prompt: str) -> str:
        """
        ユーザーのプロンプトを受け取り、AIの応答を生成して返します。
        """
        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            return f"Error generating response: {str(e)}"

