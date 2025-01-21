from flask import Flask, jsonify, render_template
import requests  # Importa correctamente requests

url = "http://127.0.0.1:5000/inscrito"
data = {
    "contact": {
        "email": "test@example.com",
        "name": {
            "first": "John",
            "last": "Doe"
        }
    }
}

response = requests.post(url, json=data)  # Usa requests correctamente
print("Status Code:", response.status_code)
print("Response:", response.json())