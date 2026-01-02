# Mac / Linux
<!-- /仮想環境起動：必ず実行する -->
source .venv/bin/activate

<!-- adk起動 -->
adk run novel_adk

<!-- APIサーバーの起動 -->
python main.py

<!-- API実行例 -->
curl -X POST "http://localhost:8000/api/edit" -H "Content-Type: application/json" -d '{"content": "昔々、あるところに桃太郎がいました。彼は鬼ヶ島へ鬼退治に行きました。しかし、鬼たちはとても優しく、一緒にお茶を飲みました。"}'