document.addEventListener('DOMContentLoaded', () => {
    const notyf = new Notyf();
    const projectsContainer = document.getElementById('projects-container');
    let editingProject = null;

    document.getElementById('create-project-btn').addEventListener('click', function () {
        const projectName = document.getElementById('project-name').value;
        const description = document.getElementById('description').value;
        const latitude = document.getElementById('latitude').value;
        const longitude = document.getElementById('longitude').value;
    
        if (!projectName) {
            notyf.error('Por favor, introduce un nombre para el proyecto.');
            return;
        }

        const url = editingProject ? '/api/edit-project' : '/api/create-project';
        const method = editingProject ? 'PUT' : 'POST';

        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: projectName,
                description: description,
                latitude: latitude,
                longitude: longitude,
                originalName: editingProject  // Para saber cuál proyecto estamos editando
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                notyf.success(editingProject ? 'Projeto atualizado com sucesso!' : 'Projeto criado com sucesso!');
                
                if (editingProject) {
                    // Actualizar el card del proyecto en la lista
                    const projectCard = document.querySelector(`.project-card[data-name="${editingProject}"]`);
                    projectCard.querySelector('h3').textContent = projectName;
                    projectCard.dataset.name = projectName;
                    editingProject = null;  // Resetear la variable de edición
                } else {
                    // Añadir un nuevo card de proyecto si es un nuevo proyecto
                    addProjectCard({
                        name: projectName,
                        description: description,
                        latitude: latitude,
                        longitude: longitude
                    });
                }

                // Limpiar los campos del formulario
                clearForm();
                document.getElementById('create-project-btn').textContent = 'Criar';
            } else {
                notyf.error(data.message);
            }
        })
        .catch(error => console.error('Error:', error));
    });

    document.getElementById('clear-form-btn').addEventListener('click', function () {
        clearForm();
    });

    function clearForm() {
        document.getElementById('project-name').value = '';
        document.getElementById('description').value = '';
        document.getElementById('latitude').value = '';
        document.getElementById('longitude').value = '';
        editingProject = null;
        document.getElementById('create-project-btn').textContent = 'Criar';
        document.querySelector('.form-container h2').textContent = 'Novo Projeto';
    }

    document.getElementById('search-projects').addEventListener('input', function () {
        const searchTerm = this.value.toLowerCase();
        const projects = document.querySelectorAll('.project-card');
    
        projects.forEach(project => {
            const projectName = project.querySelector('h3').textContent.toLowerCase();
            if (projectName.includes(searchTerm)) {
                project.style.display = '';
            } else {
                project.style.display = 'none';
            }
        });
    });

    function addProjectCard(project) {
        const projectName = project.name;
        const projectDescription = project.description || '';
        const projectLatitude = project.latitude || '';
        const projectLongitude = project.longitude || '';
    
        // Crear la estructura de la tarjeta del proyecto
        const projectCard = document.createElement('div');
        projectCard.classList.add('project-card');
    
        // Crear el encabezado de la tarjeta
        const cardHeader = document.createElement('div');
        cardHeader.classList.add('card-header');
    
        const title = document.createElement('h3');
        title.textContent = projectName;

        title.addEventListener('click', () => {
            window.location.href = `/project/${projectName}`; // Redirige al creador pasando el nombre del proyecto
        });
    
        // Botón de eliminar
        const deleteButton = document.createElement('button');
        deleteButton.textContent = '❌';
        deleteButton.classList.add('delete-btn');
    
        // Evento para eliminar el proyecto
        deleteButton.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevenir la redirección cuando se hace clic en eliminar
            if (confirm(`¿Estás seguro de que deseas eliminar el proyecto "${projectName}"?`)) {
                deleteProject(projectName, projectCard);
            }
        });
    
        cardHeader.appendChild(title);
        cardHeader.appendChild(deleteButton);
    
        // Nombre del cliente (escrito manualmente)
        const clientName = document.createElement('p');
        clientName.textContent = "HouseWay"; // Valor escrito a mano
    
        // Crear la sección de estadísticas (valores escritos manualmente)
        const stats = document.createElement('div');
        stats.classList.add('stats');
    
        const assignedStat = document.createElement('div');
        assignedStat.classList.add('stat');
        assignedStat.innerHTML = `<strong>4</strong> Imagens`;
    
        const startedStat = document.createElement('div');
        startedStat.classList.add('stat');
        startedStat.innerHTML = `<strong>2</strong> Conexões feitas`;
    
        const completedStat = document.createElement('div');
        completedStat.classList.add('stat');
        completedStat.innerHTML = `<strong>12</strong> Ambientes`;
    
        stats.appendChild(assignedStat);
        stats.appendChild(startedStat);
        stats.appendChild(completedStat);
    
        // Crear la barra de progreso (valor escrito a mano)
        const progressBar = document.createElement('div');
        progressBar.classList.add('progress-bar');
    
        const progressSpan = document.createElement('span');
        progressSpan.style.width = `40%`; // Valor escrito a mano
    
        progressBar.appendChild(progressSpan);
    
        // Añadir los elementos a la tarjeta
        projectCard.appendChild(cardHeader);
        projectCard.appendChild(clientName);
        projectCard.appendChild(stats);
        projectCard.appendChild(progressBar);
    
        // Añadir el evento de click para redirigir al creador de tours con el nombre del proyecto
        projectCard.addEventListener('click', () => {
            editingProject = projectName;
            document.getElementById('project-name').value = projectName;
            document.getElementById('description').value = projectDescription;
            document.getElementById('latitude').value = projectLatitude;
            document.getElementById('longitude').value = projectLongitude;
            document.getElementById('create-project-btn').textContent = 'Guardar';
            document.querySelector('.form-container h2').textContent = 'Editar Projeto';
        });
    
        // Añadir la tarjeta al contenedor de proyectos
        projectsContainer.appendChild(projectCard);
    }
    
    function deleteProject(projectName, projectWrapper) {
        fetch('/api/delete-project', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: projectName })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                projectWrapper.remove();
                notyf.success('Proyecto eliminado con éxito');
            } else {
                notyf.error(data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            notyf.error('Hubo un error al eliminar el proyecto');
        });
    }   
    
    function fetchProjects() {
        fetch('/api/projects')
        .then(response => response.json())
        .then(projects => {
            projects.forEach(project => {
                addProjectCard(project); // Pasamos el proyecto completo, con todos sus atributos.
            });
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }

    // Cargar los proyectos al inicio
    fetchProjects();
});
