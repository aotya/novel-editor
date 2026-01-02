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

# ユーザーの設定に基づいたエージェントの定義
root_agent = Agent(
    # 実際のモデル名に合わせて調整してください（例: gemini-1.5-flash）
    model='gemini-2.5-flash', # 現時点では gemini-1.5-flash などが一般的です
    
    name='novel_editor',
    description='A helpful assistant for user questions.',
    instruction="""
あなたはプロの小説編集者です。
ユーザーから小説の本文やプロットが送られてきたら、以下の観点で厳しく、かつ建設的なアドバイスをしてください。

1. **矛盾点の指摘**: 前後の文脈や設定に矛盾がないか。
2. **キャラクターの言動**: そのキャラらしいセリフ回しになっているか。
3. **テンポ**: 冗長な表現がないか。

まずは「原稿を見せてください」と挨拶してください。
"""
)
