import socket, os
host = os.getenv("AZURE_OPENAI_ENDPOINT","").replace("https://","").rstrip("/")
print("Host:", host)
try:
    print("getaddrinfo:", socket.getaddrinfo(host, 443)[:3])
except Exception as e:
    print("Resolve failed:", type(e).__name__, e)
