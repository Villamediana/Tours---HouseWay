from flask import Flask, request, jsonify, render_template, url_for, redirect
import os
import json
from datetime import datetime
import shutil

app = Flask(__name__)

# Ruta de la carpeta principal de uploads
UPLOAD_FOLDER = 'static/uploads/jvilla95'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@app.route('/')
def projects():
    return render_template('projects.html')

@app.route('/project/<project_name>')
def load_project(project_name):
    return render_template('index.html', project_name=project_name)

@app.route('/api/projects')
def list_projects():
    projects = []
    for project in os.listdir(UPLOAD_FOLDER):
        project_path = os.path.join(UPLOAD_FOLDER, project)
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
    project_path = os.path.join(UPLOAD_FOLDER, project_name)

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
    project_path = os.path.join(UPLOAD_FOLDER, project_name)

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
    original_project_path = os.path.join(UPLOAD_FOLDER, project_name)
    
    if not os.path.exists(original_project_path):
        return jsonify(success=False, message="El proyecto no existe.")

    # Ruta con el nuevo nombre (si se cambia)
    new_project_path = os.path.join(UPLOAD_FOLDER, new_name)

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
    folder_path = os.path.join(UPLOAD_FOLDER, project_name)
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


if __name__ == '__main__':
    app.run(debug=True)
