curl -X POST http://localhost:3000/render ^
-H "Content-Type: application/json" ^
-d "{\"option\":{\"xAxis\":{\"type\":\"category\",\"data\":[\"Mon\",\"Tue\",\"Wed\"]},\"yAxis\":{\"type\":\"value\"},\"series\":[{\"type\":\"bar\",\"data\":[120,200,150]}]}}" ^
-o response.json && python -c "import json,base64; r=json.load(open('response.json')); open('output.png','wb').write(base64.b64decode(r['data'])) if r.get('success') else print('FAIL:',r)"