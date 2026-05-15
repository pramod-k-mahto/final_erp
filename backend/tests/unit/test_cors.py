import requests

headers = {
    "Origin": "http://192.168.10.19:3000",
    "Access-Control-Request-Method": "GET",
    "Access-Control-Request-Headers": "authorization,content-type"
}

resp = requests.options("http://127.0.0.1:8000/auth/me", headers=headers)
print("Status:", resp.status_code)
print("Body:", resp.text)
