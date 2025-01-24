import os
import json
from datetime import datetime, timedelta
import shutil
import uuid
import random
import string
from flask import Flask, request, jsonify, render_template, redirect, url_for
from flask_mail import Mail, Message
from flask import session
import stat


app = Flask(__name__)
# Configuración de Flask-Mail
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587  # Para STARTTLS
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USE_SSL'] = False
app.config['MAIL_USERNAME'] = 'houseway.noreply@gmail.com'  # Cambia esto
app.config['MAIL_PASSWORD'] = 'dukh qmpv xoxy lvoh'  # Cambia esto
app.secret_key = '4cp0t12017'
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
    if 'user_email' not in session:
        return redirect(url_for('login'))

    user_email = session['user_email']
    user_folder = get_user_folder()

    # Leer el plan del usuario
    info_user_file = os.path.join(user_folder, 'info_user.json')
    with open(info_user_file, 'r', encoding='utf-8') as file:
        user_info = json.load(file)

    plan_name = user_info.get("plan_name", "free")

    # Contar la cantidad de proyectos
    existing_projects = [d for d in os.listdir(user_folder) if os.path.isdir(os.path.join(user_folder, d))]

    return render_template(
        'projects.html',
        user_email=user_email,
        plan_name=plan_name,
        project_count=len(existing_projects)
    )



@app.route('/logout')
def logout():
    session.pop('user_email', None)
    return redirect(url_for('login'))


# Función para generar un código aleatorio
def generar_codigo():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))


# Página de login
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        if not email:
            return render_template('login.html', error="Por favor, digite um e-mail valido.")

        # Cargar datos de users.json
        try:
            with open(USERS_JSON, 'r', encoding='utf-8') as file:
                try:
                    users_data = json.load(file)
                except json.JSONDecodeError:
                    users_data = {}
        except FileNotFoundError:
            users_data = {}

        if email not in users_data:
            return render_template('login.html', error="Não existe nenhuma conta com esse e-mail.",
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
        enviar_correo(email, "Seu codigo para fazer login", f"{codigo}")

        return render_template('verificar.html', email=email)

    return render_template('login.html')



# Página para verificar el código
@app.route('/verificar', methods=['POST'])
def verificar_codigo():
    email = request.form.get('email')
    codigo_introducido = request.form.get('codigo')

    with open(USERS_JSON, 'r', encoding='utf-8') as file:
        users_data = json.load(file)

    if email not in users_data:
        return render_template('login.html', error="Email não cadastrado.")

    user_id = users_data[email]
    user_folder = os.path.join(USERS_FOLDER, user_id)
    codigo_file = os.path.join(user_folder, 'codigo.json')

    if not os.path.exists(codigo_file):
        return render_template('verificar.html', email=email, error="Codigo não encontrado. Solicite um novo codigo.")

    with open(codigo_file, 'r', encoding='utf-8') as file:
        codigo_data = json.load(file)

    expiracion = datetime.fromisoformat(codigo_data['expiracion'])
    if datetime.utcnow() > expiracion:
        return render_template('verificar.html', email=email, error="O codigo expirou. Solicite um novo.")

    if codigo_introducido != codigo_data['codigo']:
        return render_template('verificar.html', email=email, error="O codigo é incorreto.")

    # Guarda el usuario en la sesión
    session['user_email'] = email

    return redirect(url_for('projects'))



# Reenviar código
@app.route('/reenviar', methods=['POST'])
def reenviar_codigo():
    email = request.form.get('email')

    # Cargar datos de users.json
    with open(USERS_JSON, 'r', encoding='utf-8') as file:
        users_data = json.load(file)

    if email not in users_data:
        return render_template('login.html', error="Email não cadastrado.")

    user_id = users_data[email]
    user_folder = os.path.join(USERS_FOLDER, user_id)
    os.makedirs(user_folder, exist_ok=True)

    # Generar y enviar nuevo código
    codigo = generar_codigo()
    expiracion = datetime.utcnow() + timedelta(minutes=5)
    codigo_data = {"codigo": codigo, "expiracion": expiracion.isoformat()}

    with open(os.path.join(user_folder, 'codigo.json'), 'w', encoding='utf-8') as code_file:
        json.dump(codigo_data, code_file, ensure_ascii=False, indent=4)

    enviar_correo(email, "Seu codigo para fazer login", f"{codigo}")
    return render_template('verificar.html', email=email, mensaje="Você recebeu um novo código no seu e-mail.")


def enviar_correo(destinatario, asunto, cuerpo):
    try:
        # Plantilla HTML para el correo
        html_cuerpo = f"""
        <html>
        <body style="font-family: Arial, sans-serif; background-color: #333; color: #FFF; line-height: 1.6; margin: 0; padding: 0;">
            <div style="max-width: 600px; margin: 20px auto; border-radius: 10px; overflow: hidden; background-color: #444; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);border: 1px solid #ddd; border-radius: 10px;">
                <div style="background-color: #2B2B2B; padding: 20px; text-align: center;">
                    <h1 style="margin: 0; font-size: 36px; color: #FFF;">HouseWay</h1>
                </div>
                <div style="padding: 40px; text-align: center;">
                    <h2 style="color: #FFF; font-size: 20px; margin-bottom: 20px;">{asunto}</h2>
                    <p style="font-size: 30px; color: #FFF; margin: 0; text-align: center;">{cuerpo}</p>
                </div>
                <div style="background-color: #555; padding: 15px; text-align: center; font-size: 14px; color: #DDD;">
                    <p>Este é um email automático. Por favor, não responda.</p>
                </div>
            </div>
        </body>
        </html>
        """

        # Crear el mensaje
        msg = Message(asunto, sender=app.config['MAIL_USERNAME'], recipients=[destinatario])
        msg.body = cuerpo  # Texto plano
        msg.html = html_cuerpo  # Cuerpo HTML con diseño
        mail.send(msg)

        print(f"E-mail enviado para {destinatario}")
    except Exception as e:
        print(f"Erro ao enviar o e-mail: {e}")





#STARTEND WEBHOOKS ---------------------------
@app.route('/inscrito', methods=['POST'])
def visitante_inscrito():
    try:
        data = request.json  # Recibe los datos del webhook

        # Extraer los datos necesarios
        contact = data.get('data', {}).get('contact', {})
        email = contact.get('email')
        first_name = contact.get('name', {}).get('first', "N/A")  # Algunos nombres pueden no venir
        last_name = contact.get('name', {}).get('last', "N/A")
        phone = contact.get('phone', "N/A")
        created_date = contact.get('createdDate', "N/A")

        # Datos para el archivo info_user.json
        info_user_data = {
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
            "phone": phone,
            "plan_name": "teste",
            "plan_start_date": created_date
        }

        if not email:
            return jsonify({'status': 'error', 'message': 'O e-mail é obrigatorio.'}), 400

        # Actualiza o crea el archivo users.json
        with open(USERS_JSON, 'r+', encoding='utf-8') as file:
            try:
                users_data = json.load(file)
            except json.JSONDecodeError:
                users_data = {}

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
    # Verificar si el usuario está logado
    if 'user_email' not in session:
        return redirect(url_for('login'))

    user_email = session['user_email']

    # Obtener el user_id desde el archivo 'users.json' basado en el email del usuario
    with open(USERS_JSON, 'r', encoding='utf-8') as file:
        users_data = json.load(file)
        user_id = users_data.get(user_email)

    if not user_id:
        return redirect(url_for('login'))  # Si no se encuentra el user_id, redirigir al login

    # Pasar el user_id y project_name a la plantilla
    return render_template('index.html', user_id=user_id, project_name=project_name)


@app.route('/api/projects')
def list_projects():
    try:
        user_folder = get_user_folder()  # Carpeta del usuario logado
        projects = []
        for project in os.listdir(user_folder):
            project_path = os.path.join(user_folder, project)
            if os.path.isdir(project_path):
                json_path = os.path.join(project_path, 'metadata.json')
                if os.path.exists(json_path):
                    with open(json_path, 'r') as json_file:
                        project_data = json.load(json_file)
                        projects.append({
                            "name": project_data.get("project_name"),
                            "client": project_data.get("client"),
                            "description": project_data.get("project_description", ""),
                            "latitude": project_data.get("project_latitude", ""),
                            "longitude": project_data.get("project_longitude", ""),
                            "viewer_url": project_data.get("viewer_url", "")
                        })
        return jsonify(projects)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/create-project', methods=['POST'])
def create_project():
    try:
        user_folder = get_user_folder()  # Carpeta del usuario logado
        data = request.json
        project_name = data.get('name')
        client = data.get('client')
        description = data.get('description')
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        project_path = os.path.join(user_folder, project_name)

        if not os.path.exists(project_path):
            os.makedirs(project_path)

            # Crear metadata.json
            project_metadata = {
                "project_name": project_name,
                "client": client,
                "project_description": description,
                "project_latitude": latitude,
                "project_longitude": longitude,
                "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "images": 0,  # Inicializamos en 0
                "hotspots": 0  # Inicializamos en 0
            }
            metadata_path = os.path.join(project_path, 'metadata.json')
            with open(metadata_path, 'w') as json_file:
                json.dump(project_metadata, json_file, indent=4)

            # Crear index.html por defecto
            index_html_content = f"""
<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{project_name} - Virtual Tour</title>
    <link rel="stylesheet" href="/static/css/styles.css">
    <style>
        body {{
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh;
            text-align: center;
            background-color: #f9f9f9;
        }}
        h1 {{
            font-size: 3em;
            margin-bottom: 20px;
            color: #333;
        }}
        p {{
            font-size: 1.2em;
            color: #555;
        }}
    </style>
</head>
<body>
    <h1>Use o editor para começar a criação do Tour.</h1>
    <p>Projeto: <strong>{project_name}</strong></p>
</body>
</html>
"""

            index_path = os.path.join(project_path, 'index.html')
            with open(index_path, 'w', encoding='utf-8') as index_file:
                index_file.write(index_html_content)

            return jsonify(success=True)
        else:
            return jsonify(success=False, message="O projeto já existe.")
    except Exception as e:
        return jsonify(success=False, message=str(e))


@app.route('/api/delete-project', methods=['POST'])
def delete_project():
    # Verificar si el usuario está logado
    if 'user_email' not in session:
        return jsonify(success=False, message="Usuário não autenticado."), 403

    # Obtener la carpeta del usuario logado
    user_email = session['user_email']
    user_id = None

    with open(USERS_JSON, 'r', encoding='utf-8') as file:
        users_data = json.load(file)
        if user_email in users_data:
            user_id = users_data[user_email]
        else:
            return jsonify(success=False, message="Usuário não encontrado."), 404

    user_folder = os.path.join(USERS_FOLDER, user_id)

    # Obtener el nombre del proyecto
    data = request.json
    project_name = data.get('name')

    if not project_name:
        return jsonify(success=False, message="Nome do projeto é obrigatório."), 400

    project_path = os.path.join(user_folder, project_name)

    if os.path.exists(project_path):
        try:
            # Intentar eliminar varias veces para manejar bloqueos ocasionales
            for _ in range(3):
                try:
                    # Cambiar permisos para garantizar la eliminación
                    for root, dirs, files in os.walk(project_path):
                        for dir_ in dirs:
                            os.chmod(os.path.join(root, dir_), stat.S_IWRITE)
                        for file_ in files:
                            os.chmod(os.path.join(root, file_), stat.S_IWRITE)

                    shutil.rmtree(project_path)  # Intentar eliminar
                    # Si se elimina correctamente, salir del bucle
                    return jsonify(success=True, message="Projeto eliminado com sucesso.")
                except PermissionError as e:
                    print(f"Tentando novamente por erro de permissão: {str(e)}")
                    continue  # Reintentar
            return jsonify(success=False, message="Não foi possível excluir o projeto devido a um erro de permissão."), 500
        except Exception as e:
            return jsonify(success=False, message=f"Erro ao excluir o projeto: {str(e)}"), 500
    else:
        return jsonify(success=False, message="O projeto não existe."), 404




@app.route('/api/update-project/<project_name>', methods=['POST', 'PUT'])
def update_project(project_name):    
    # Verificar si el usuario está logado
    if 'user_email' not in session:
        return jsonify(success=False, message="Usuário não autenticado."), 403

    # Obtener la carpeta del usuario logado
    user_email = session['user_email']
    user_id = None

    # Leer el archivo users.json para obtener el user_id correspondiente
    with open(USERS_JSON, 'r', encoding='utf-8') as file:
        users_data = json.load(file)
        if user_email in users_data:
            user_id = users_data[user_email]
        else:
            return jsonify(success=False, message="Usuário não encontrado."), 404

    user_folder = os.path.join(USERS_FOLDER, user_id)
    
    # Ruta original del proyecto
    original_project_path = os.path.join(user_folder, project_name)
    
    if not os.path.exists(original_project_path):
        return jsonify(success=False, message="O projeto não existe."), 404

    # Leer los datos enviados en la solicitud
    data = request.json
    new_name = data.get('name')
    description = data.get('description')
    latitude = data.get('latitude')
    longitude = data.get('longitude')

    # Ruta con el nuevo nombre (si se cambia)
    new_project_path = os.path.join(user_folder, new_name)

    # Renombrar la carpeta si el nombre cambia
    if project_name != new_name:
        os.rename(original_project_path, new_project_path)

    # Actualizar los datos del proyecto en el JSON
    json_path = os.path.join(new_project_path, 'metadata.json')
    if os.path.exists(json_path):
        with open(json_path, 'r') as json_file:
            project_data = json.load(json_file)
    else:
        project_data = {}

    project_data.update({
        "project_name": new_name,
        "project_description": description,
        "project_latitude": latitude,
        "project_longitude": longitude,
    })

    with open(json_path, 'w') as json_file:
        json.dump(project_data, json_file, indent=4)

    return jsonify(success=True, message="Projeto atualizado corretamente.")


from urllib.parse import unquote
@app.route('/save-image', methods=['POST'])
def save_image():
    user_email = session.get('user_email')
    if not user_email:
        return jsonify(success=False, message="Usuário não autenticado"), 401

    project_name = request.form.get('folderName')
    if not project_name:
        return jsonify(success=False, message="Nenhum nome de pasta fornecido."), 400

    with open(USERS_JSON, 'r', encoding='utf-8') as file:
        users_data = json.load(file)
        user_id = users_data.get(user_email)
        if not user_id:
            return jsonify(success=False, message="Usuário não encontrado."), 404

    folder_path = os.path.join(USERS_FOLDER, user_id, project_name)
    os.makedirs(folder_path, exist_ok=True)

    # Procesar imágenes nuevas
    files = request.files.getlist('image')
    for file in files:
        if file and file.filename != '':
            file_path = os.path.join(folder_path, file.filename)
            file.save(file_path)

    # Leer el tourConfig enviado desde el cliente
    tour_config_raw = request.form.get('tourConfig')
    if not tour_config_raw:
        return jsonify(success=False, message="O tourConfig está vazio."), 400

    try:
        tour_config = json.loads(tour_config_raw)
    except Exception:
        return jsonify(success=False, message="Erro no formato do tourConfig."), 400

    # Identificar imágenes referenciadas en el tourConfig
    referenced_images = set()
    for scene_id, scene_data in tour_config['scenes'].items():
        blob_url = scene_data['panorama']
        if "#" in blob_url:
            _, encoded_name = blob_url.split("#")
            file_name = unquote(encoded_name)  # Decodificar el nombre del archivo
            scene_data['panorama'] = f"./{file_name}"
            referenced_images.add(file_name)
        else:
            return jsonify(success=False, message=f"Formato inesperado para panorama na cena {scene_id}"), 400

    # Eliminar imágenes no referenciadas, pero mantener archivos clave
    existing_files = set(os.listdir(folder_path))
    files_to_keep = referenced_images | {"tourConfig.json", "index.html", "metadata.json"}
    files_to_remove = existing_files - files_to_keep
    for file_name in files_to_remove:
        file_path = os.path.join(folder_path, file_name)
        if os.path.isfile(file_path):
            os.remove(file_path)

    # Guardar el JSON (tourConfig) en la carpeta del proyecto
    json_path = os.path.join(folder_path, 'tourConfig.json')
    with open(json_path, 'w', encoding='utf-8') as json_file:
        json.dump(tour_config, json_file, indent=4, ensure_ascii=False)

    # Generar el archivo HTML del visualizador
    create_viewer_html(folder_path, tour_config)

    # URL del visualizador
    viewer_url = url_for('static', filename=f'users/{user_id}/{project_name}/index.html', _external=True)

    return jsonify(success=True, message="Projeto salvo com sucesso.", viewer_url=viewer_url)



def create_viewer_html(folder_path, tour_config):
    viewer_html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Visualizador Tour 360°</title>
        <script src="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js"></script>
        <link rel="stylesheet" href="../../../css/pannellum.css">
    </head>
    <body>
        <div id="viewer" style="width: 100%; height: 100vh;"></div>
        <script>
            pannellum.viewer('viewer', {json.dumps(tour_config, indent=4)});
        </script>
    </body>
    </html>
    """
    with open(os.path.join(folder_path, 'index.html'), 'w', encoding='utf-8') as html_file:
        html_file.write(viewer_html_content)





# Obtiene la carpeta personal del usuario logado
def get_user_folder():
    user_email = session.get('user_email')
    if not user_email:
        raise ValueError("Usuário não logado.")
    user_id = get_user_id(user_email)  # Función para obtener el ID del usuario
    return os.path.join(USERS_FOLDER, user_id)

# Función auxiliar para obtener el ID del usuario desde el email
def get_user_id(email):
    with open(USERS_JSON, 'r', encoding='utf-8') as file:
        users_data = json.load(file)
    return users_data.get(email)


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000)