import os
import json
from datetime import datetime, timedelta
import shutil
import uuid
import random
import string
from flask import Flask, request, jsonify, render_template, redirect, url_for
from flask_mail import Mail, Message


app = Flask(__name__)
# Configuración de Flask-Mail
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 465
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'houseway.noreply@gmail.com'  # Cambia esto
app.config['MAIL_PASSWORD'] = 'dukh qmpv xoxy lvoh'  # Cambia esto
mail = Mail(app)

# Rutas de archivos y carpetas
USERS_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'users')
USERS_JSON = os.path.join(USERS_FOLDER, 'users.json')
os.makedirs(USERS_FOLDER, exist_ok=True)

if not os.path.exists(USERS_JSON):
    with open(USERS_JSON, 'w', encoding='utf-8') as file:
        json.dump({}, file, ensure_ascii=False, indent=4)


@app.route('/')
def projects():
    return render_template('login.html')


# Función para generar un código aleatorio
def generar_codigo():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))


# Página de login
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        if not email:
            return render_template('login.html', error="Por favor, introduce un correo válido.")

        # Cargar datos de users.json
        with open(USERS_JSON, 'r', encoding='utf-8') as file:
            users_data = json.load(file)

        if email not in users_data:
            return render_template('login.html', error="No hay una cuenta asociada a este correo.",
                                   registro_url="https://joyceemiguel.wixstudio.com/houseway2/members-area/my/my-account")

        # Generar y enviar código al correo
        user_id = users_data[email]
        user_folder = os.path.join(USERS_FOLDER, user_id)
        os.makedirs(user_folder, exist_ok=True)

        codigo = generar_codigo()
        expiracion = datetime.utcnow() + timedelta(minutes=5)
        codigo_data = {"codigo": codigo, "expiracion": expiracion.isoformat()}

        with open(os.path.join(user_folder, 'codigo.json'), 'w', encoding='utf-8') as code_file:
            json.dump(codigo_data, code_file, ensure_ascii=False, indent=4)

        # Enviar correo
        enviar_correo(email, "Tu código de inicio de sesión", f"Tu código es: {codigo}")

        return render_template('verificar.html', email=email)

    return render_template('login.html')


# Página para verificar el código
@app.route('/verificar', methods=['POST'])
def verificar_codigo():
    email = request.form.get('email')
    codigo_introducido = request.form.get('codigo')

    # Cargar datos de users.json
    with open(USERS_JSON, 'r', encoding='utf-8') as file:
        users_data = json.load(file)

    if email not in users_data:
        return render_template('login.html', error="Correo no encontrado.")

    user_id = users_data[email]
    user_folder = os.path.join(USERS_FOLDER, user_id)
    codigo_file = os.path.join(user_folder, 'codigo.json')

    if not os.path.exists(codigo_file):
        return render_template('verificar.html', email=email, error="Código no encontrado. Solicita uno nuevo.")

    with open(codigo_file, 'r', encoding='utf-8') as file:
        codigo_data = json.load(file)

    expiracion = datetime.fromisoformat(codigo_data['expiracion'])
    if datetime.utcnow() > expiracion:
        return render_template('verificar.html', email=email, error="El código ha expirado. Solicita uno nuevo.")

    if codigo_introducido != codigo_data['codigo']:
        return render_template('verificar.html', email=email, error="El código es incorrecto.")

    # Redirigir al index tras autenticación exitosa
    return redirect(url_for('projects'))


# Reenviar código
@app.route('/reenviar', methods=['POST'])
def reenviar_codigo():
    email = request.form.get('email')

    # Cargar datos de users.json
    with open(USERS_JSON, 'r', encoding='utf-8') as file:
        users_data = json.load(file)

    if email not in users_data:
        return render_template('login.html', error="Correo no encontrado.")

    user_id = users_data[email]
    user_folder = os.path.join(USERS_FOLDER, user_id)
    os.makedirs(user_folder, exist_ok=True)

    # Generar y enviar nuevo código
    codigo = generar_codigo()
    expiracion = datetime.utcnow() + timedelta(minutes=5)
    codigo_data = {"codigo": codigo, "expiracion": expiracion.isoformat()}

    with open(os.path.join(user_folder, 'codigo.json'), 'w', encoding='utf-8') as code_file:
        json.dump(codigo_data, code_file, ensure_ascii=False, indent=4)

    enviar_correo(email, "Tu nuevo código de inicio de sesión", f"Tu código es: {codigo}")
    return render_template('verificar.html', email=email, mensaje="Se ha enviado un nuevo código a tu correo.")


# Función para enviar correos
def enviar_correo(destinatario, asunto, cuerpo):
    msg = Message(asunto, sender=app.config['MAIL_USERNAME'], recipients=[destinatario])
    msg.body = cuerpo
    mail.send(msg)

#STARTEND WEBHOOKS ---------------------------
@app.route('/inscrito', methods=['POST'])
def visitante_inscrito():
    try:
        data = request.json  # Recibe los datos del webhook
        email = data['contact']['email']
        created_date = data['contact']['createdDate']

        # Datos para el archivo info_user.json
        info_user_data = {
            "first_name": data['contact']['name']['first'],
            "last_name": data['contact']['name']['last'],
            "email": email,
            "plan_name": "teste",
            "plan_start_date": created_date
        }

        # Actualiza o crea el archivo users.json
        with open(USERS_JSON, 'r+', encoding='utf-8') as file:
            users_data = json.load(file)

            if email not in users_data:  # Si el correo no existe
                user_id = str(uuid.uuid4())  # Genera un ID único
                users_data[email] = user_id

                # Crear carpeta y archivo info_user.json
                user_folder = os.path.join(USERS_FOLDER, user_id)
                os.makedirs(user_folder, exist_ok=True)

                info_user_file = os.path.join(user_folder, 'info_user.json')
                with open(info_user_file, 'w', encoding='utf-8') as user_file:
                    json.dump(info_user_data, user_file, ensure_ascii=False, indent=4)
            else:  # Si el correo ya existe
                user_id = users_data[email]

                # Actualizar info_user.json existente
                user_folder = os.path.join(USERS_FOLDER, user_id)
                info_user_file = os.path.join(user_folder, 'info_user.json')
                with open(info_user_file, 'w', encoding='utf-8') as user_file:
                    json.dump(info_user_data, user_file, ensure_ascii=False, indent=4)

            # Guarda los cambios en users.json
            file.seek(0)
            json.dump(users_data, file, ensure_ascii=False, indent=4)
            file.truncate()

        return jsonify({'status': 'sucesso'}), 200

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/plano_adquirido', methods=['POST'])
def plano_adquirido():
    try:
        data = request.json  # Recibe los datos del webhook
        email = data['data']['contact']['email']

        # Datos para el archivo info_user.json
        info_user_data = {
            "first_name": data['data']['contact']['name']['first'],
            "last_name": data['data']['contact']['name']['last'],
            "email": email,
            "plan_name": data['data']['plan_title'],
            "plan_start_date": data['data']['plan_start_date']
        }

        # Actualiza o crea el archivo users.json
        with open(USERS_JSON, 'r+', encoding='utf-8') as file:
            users_data = json.load(file)

            if email not in users_data:  # Si el correo no existe
                user_id = str(uuid.uuid4())  # Genera un ID único
                users_data[email] = user_id

                # Crear carpeta y archivo info_user.json
                user_folder = os.path.join(USERS_FOLDER, user_id)
                os.makedirs(user_folder, exist_ok=True)

                info_user_file = os.path.join(user_folder, 'info_user.json')
                with open(info_user_file, 'w', encoding='utf-8') as user_file:
                    json.dump(info_user_data, user_file, ensure_ascii=False, indent=4)
            else:  # Si el correo ya existe
                user_id = users_data[email]

                # Actualizar info_user.json existente
                user_folder = os.path.join(USERS_FOLDER, user_id)
                info_user_file = os.path.join(user_folder, 'info_user.json')
                with open(info_user_file, 'w', encoding='utf-8') as user_file:
                    json.dump(info_user_data, user_file, ensure_ascii=False, indent=4)

            # Guarda los cambios en users.json
            file.seek(0)
            json.dump(users_data, file, ensure_ascii=False, indent=4)
            file.truncate()

        return jsonify({'status': 'sucesso'}), 200

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/plano_cancelado', methods=['POST'])
def webhook():
    data = request.json  # Recebe os dados enviados pelo webhook
    print("Dados recebidos:", data)
    # Aqui você pode processar os dados conforme necessário
    return jsonify({'status': 'sucesso'}), 200
#END WEBHOOKS ---------------------------

@app.route('/project/<project_name>')
def load_project(project_name):
    return render_template('index.html', project_name=project_name)

@app.route('/api/projects')
def list_projects():
    projects = []
    for project in os.listdir(USERS_FOLDER):
        project_path = os.path.join(USERS_FOLDER, project)
        if os.path.isdir(project_path):
            # Verificar si el archivo project_data.json existe
            json_path = os.path.join(project_path, 'metadata.json')
            if os.path.exists(json_path):
                try:
                    with open(json_path, 'r') as json_file:
                        project_data = json.load(json_file)
                        # Asegurarse de que se obtengan los datos correctamente
                        projects.append({
                            "name": project_data.get("project_name"),
                            "description": project_data.get("project_description", ""),
                            "latitude": project_data.get("project_latitude", ""),
                            "longitude": project_data.get("project_longitude", ""),
                            "viewer_url": project_data.get("viewer_url", "")
                        })
                except Exception as e:
                    print(f"Error al leer el archivo JSON para el proyecto {project}: {str(e)}")
    
    return jsonify(projects)




@app.route('/api/create-project', methods=['POST'])
def create_project():
    data = request.json
    project_name = data.get('name')
    description = data.get('description')
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    project_path = os.path.join(USERS_FOLDER, project_name)

    if not os.path.exists(project_path):
        os.makedirs(project_path)
        
        # Guardar los detalles en un archivo JSON dentro del proyecto
        project_metadata = {
            "project_name": project_name,
            "project_description": description,
            "project_latitude": latitude,
            "project_longitude": longitude,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "images": []
        }

        metadata_path = os.path.join(project_path, 'metadata.json')
        with open(metadata_path, 'w') as json_file:
            json.dump(project_metadata, json_file, indent=4)

        return jsonify(success=True)
    else:
        return jsonify(success=False, message="El proyecto ya existe.")
  

@app.route('/api/delete-project', methods=['POST'])
def delete_project():
    data = request.json
    project_name = data.get('name')
    project_path = os.path.join(USERS_FOLDER, project_name)

    if os.path.exists(project_path):
        shutil.rmtree(project_path)  # Eliminar la carpeta del proyecto y su contenido
        return jsonify(success=True)
    else:
        return jsonify(success=False, message="El proyecto no existe.")

@app.route('/api/update-project/<project_name>', methods=['POST'])
def update_project(project_name):
    data = request.json
    new_name = data.get('name')
    description = data.get('description')
    latitude = data.get('latitude')
    longitude = data.get('longitude')

    # Ruta original del proyecto
    original_project_path = os.path.join(USERS_FOLDER, project_name)
    
    if not os.path.exists(original_project_path):
        return jsonify(success=False, message="El proyecto no existe.")

    # Ruta con el nuevo nombre (si se cambia)
    new_project_path = os.path.join(USERS_FOLDER, new_name)

    # Renombrar la carpeta si el nombre cambia
    if project_name != new_name:
        os.rename(original_project_path, new_project_path)

    # Actualizar los datos del proyecto en el JSON
    json_path = os.path.join(new_project_path, 'project_data.json')
    if os.path.exists(json_path):
        with open(json_path, 'r') as json_file:
            project_data = json.load(json_file)
    else:
        project_data = {}

    project_data.update({
        "project_name": new_name,
        "description": description,
        "latitude": latitude,
        "longitude": longitude,
    })

    with open(json_path, 'w') as json_file:
        json.dump(project_data, json_file, indent=4)

    return jsonify(success=True, message="Proyecto actualizado correctamente.")


@app.route('/save-image', methods=['POST'])
def save_image():
    project_name = request.form.get('folderName')  # Aquí se obtiene solo el nombre del proyecto
    if not project_name:
        return jsonify(success=False, message="No folder name provided")

    # Concatenamos la ruta del usuario con el nombre del proyecto
    folder_path = os.path.join(USERS_FOLDER, project_name)
    if not os.path.exists(folder_path):
        os.makedirs(folder_path)

    images_data_json = request.form.get('imagesData')
    images_data = json.loads(images_data_json)

    saved_files = []
    project_data = {
        "project_name": project_name,
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "images": []
    }

    files = request.files.getlist('image')

    for index, image in enumerate(images_data):
        file = files[index]

        if file and file.filename != '':
            file_path = os.path.join(folder_path, file.filename)
            file.save(file_path)
            saved_files.append(file.filename)

            image_data = {
                "room": image['name'],
                "nameOriginal": file.filename,
                "order": image['order'],
                "path": file_path.replace("\\", "/")
            }
            project_data["images"].append(image_data)

    if not project_data["images"]:
        return jsonify(success=False, message="No images processed")

    project_data["images"].sort(key=lambda x: x["order"])

    create_viewer_html(folder_path, project_data["images"][0]["path"])

    viewer_url = url_for('static', filename=f'uploads/jvilla95/{project_name}/index.html')
    project_data["viewer_url"] = f"http://127.0.0.1:5000{viewer_url}"

    json_path = os.path.join(folder_path, 'project_data.json')
    with open(json_path, 'w') as json_file:
        json.dump(project_data, json_file, indent=4)

    if saved_files:
        return jsonify(success=True, message="Files saved successfully", files=saved_files, viewer_url=project_data["viewer_url"])
    else:
        return jsonify(success=False, message="No files saved")




def create_viewer_html(folder_path, first_image_path):
    viewer_html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Visualizador Tour 360°</title>
        <style>
            body {{
                font-family: Arial, sans-serif;
                margin: 0;
                display: flex;
                flex-direction: column;
                height: 100vh;
                background-color: #1c1c1e;
                color: #f5f5f7;
            }}
            #viewer-container {{
                width: 100%;
                height: 100%;
                display: flex;
                justify-content: center;
                align-items: center;
                position: relative;
                box-sizing: border-box;
            }}
            #viewer {{
                width: 100%;
                height: 100%;
                background-color: #000;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
            }}
        </style>
    </head>
    <body>
        <div id="viewer-container">
            <div id="viewer"></div>
        </div>

        <script src="../../js/three.min.js"></script>
        <script src="../../js/panolens.min.js"></script>
        <script>
            fetch('project_data.json')
                .then(response => response.json())
                .then(data => {{
                    const firstImagePath = data.images[0].path;
                    const viewer = new PANOLENS.Viewer({{ container: document.getElementById('viewer') }});
                    const panorama = new PANOLENS.ImagePanorama('/' + firstImagePath);
                    viewer.add(panorama);
                }})
                .catch(error => console.error('Error al cargar el JSON:', error));
        </script>
    </body>
    </html>
    """
    with open(os.path.join(folder_path, 'index.html'), 'w') as html_file:
        html_file.write(viewer_html_content)


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000)
