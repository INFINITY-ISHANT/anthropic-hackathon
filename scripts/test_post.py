import json
import urllib.request

url = 'http://127.0.0.1:8000/api/v1/budget-calculator'
data = json.dumps({'profile':'student','income':600000,'state':'Punjab','question':''}).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type':'application/json'})
with urllib.request.urlopen(req) as resp:
    print(resp.status)
    print(resp.read().decode('utf-8'))
