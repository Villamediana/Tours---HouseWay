document.addEventListener('DOMContentLoaded', () => {
    const notyf = new Notyf();
    const projectsContainer = document.getElementById('projects-container');
    let editingProject = null;

    document.getElementById('create-project-btn').addEventListener('click', function () {
        const projectName = document.getElementById('project-name').value;
        const projectClient = document.getElementById('project-client').value;
        const description = document.getElementById('description').value;
        const latitude = document.getElementById('latitude').value;
        const longitude = document.getElementById('longitude').value;
    
        if (!projectName || !projectClient) {
            notyf.error('Por favor, insira um nome e um cliente para o projeto.');
            return;
        }
        
    
        // Obtener todos los proyectos actuales en la UI
        const currentProjects = document.querySelectorAll('.project-card');
    
        // Solo verificar la cantidad de proyectos si NO estamos editando
        if (!editingProject) {
            const userPlan = "tesste"; // Cambiar según el plan real del usuario
            if (userPlan === "teste" && currentProjects.length >= 1) {
                notyf.error('Seu plano só permite criar 1 projeto.');
                setTimeout(() => {
                    window.open('https://joyceemiguel.wixstudio.com/houseway2/planos-tours', '_blank');
                }, 2000); // Agregar un pequeño retraso para que el usuario vea el mensaje
                return;
            }
        }
    
        const url = editingProject ? '/api/update-project/' + editingProject : '/api/create-project';
        const method = editingProject ? 'PUT' : 'POST';
    
        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: projectName,
                client: projectClient,                
                description: description,
                latitude: latitude,
                longitude: longitude,
                originalName: editingProject, // Solo si se está editando
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                notyf.success(editingProject ? 'Projeto atualizado com sucesso!' : 'Projeto criado com sucesso!');
    
                if (editingProject) {
                    // Actualizar dinámicamente el card del proyecto
                    const projectCard = document.querySelector(`.project-card[data-name="${editingProject}"]`);
                    if (projectCard) {
                        // Actualiza los valores dentro del card
                        projectCard.querySelector('h3').textContent = projectName;
                        projectCard.dataset.name = projectName; // Actualizar el atributo para futuras búsquedas
                        projectCard.querySelector('p').textContent = projectClient;
                        projectCard.setAttribute('title', description); // Actualizar el tooltip con la nueva descripción
    
                        // Aquí puedes actualizar otros detalles del card si es necesario
                        const stats = projectCard.querySelector('.stats');
                        if (stats) {
                            stats.innerHTML = `
                                <div class="stat"><strong>${latitude || '0'}</strong> Latitude</div>
                                <div class="stat"><strong>${longitude || '0'}</strong> Longitude</div>
                            `;
                        }
                    }
                    editingProject = null; // Resetear la variable de edición
                } else {
                    // Crear y añadir una nueva tarjeta si es un nuevo proyecto
                    addProjectCard({
                        name: projectName,
                        client: projectClient,
                        description: description,
                        latitude: latitude,
                        longitude: longitude,
                    });
                    updateNoProjectsMessage();
                }
    
                // Limpiar los campos del formulario
                clearForm();
                document.getElementById('create-project-btn').textContent = 'Criar';
            } else {
                notyf.error(data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            notyf.error('Ocorreu um erro ao processar a solicitação.');
        });
    });
    
    
    


    document.getElementById('clear-form-btn').addEventListener('click', function () {
        clearForm();
    });

    function clearForm() {
        document.getElementById('project-name').value = '';
        document.getElementById('project-client').value = '';
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
            const clientName = project.querySelector('p').textContent.toLowerCase(); // Cliente asociado
    
            // Mostrar el proyecto si el término coincide con el nombre o el cliente
            if (projectName.includes(searchTerm) || clientName.includes(searchTerm)) {
                project.style.display = '';
            } else {
                project.style.display = 'none';
            }
        });
    });
    

    function addProjectCard(project) {
        const projectName = project.name;
        const projectClient = project.client;
        const projectDescription = project.description || 'Sem descrição disponível';
        const projectLatitude = project.latitude || '';
        const projectLongitude = project.longitude || '';
    
        // Crear la estructura de la tarjeta del proyecto
        const projectCard = document.createElement('div');
        projectCard.classList.add('project-card');
        projectCard.setAttribute('title', projectDescription); // Tooltip con la descripción del proyecto
    
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
            if (confirm(`Tem certeza de que deseja excluir o projeto "${projectName}"?`)) {
                deleteProject(projectName, projectCard);
            }
        });
    
        cardHeader.appendChild(title);
        cardHeader.appendChild(deleteButton);
    
        // Nombre del cliente
        const clientName = document.createElement('p');
        clientName.textContent = projectClient; // Valor estático
    
        // Crear la barra de progreso (opcional, si decides mantenerla)
        const progressBar = document.createElement('div');
        progressBar.classList.add('progress-bar');
    
        const progressSpan = document.createElement('span');
        progressSpan.style.width = `100%`; // Por defecto
    
        progressBar.appendChild(progressSpan);
    
        // Añadir los elementos a la tarjeta
        projectCard.appendChild(cardHeader);
        projectCard.appendChild(clientName);
        projectCard.appendChild(progressBar);
    
        // Añadir el evento de click para redirigir al creador de tours con el nombre del proyecto
        projectCard.addEventListener('click', () => {
            editingProject = projectName;
            document.getElementById('project-name').value = projectName;
            document.getElementById('project-client').value = projectClient;
            document.getElementById('description').value = projectDescription;
            document.getElementById('latitude').value = projectLatitude;
            document.getElementById('longitude').value = projectLongitude;
            document.getElementById('create-project-btn').textContent = 'Salvar';
            document.querySelector('.form-container h2').textContent = 'Editar';
        });
    
        // Añadir la tarjeta al contenedor de proyectos
        projectsContainer.appendChild(projectCard);
    }
    
    

    function deleteProject(projectName, projectWrapper) {
        fetch('/api/delete-project', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: projectName }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                if (projectWrapper && projectWrapper.parentNode) {
                    projectWrapper.parentNode.removeChild(projectWrapper); // Eliminar de la UI
                }
                notyf.success('Projeto eliminado com sucesso.');
                updateNoProjectsMessage();
            } else {
                console.error('Error ao excluir o projeto:', data.message);
                notyf.error(data.message || 'Erro ao excluir o projeto.');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            notyf.error('Erro ao excluir o projeto.');
        });
    }
    

    function fetchProjects() {
        fetch('/api/projects')
            .then(response => response.json())
            .then(projects => {
                const noProjectsMessage = document.getElementById('no-projects-message');
    
                if (projects.length === 0) {
                    updateNoProjectsMessage();
                } else {
                    // Si hay proyectos, oculta el mensaje y agrega las tarjetas
                    noProjectsMessage.style.display = 'none';
                    projects.forEach(project => {
                        // Asegurarse de que los campos de imágenes y hotspots existan
                        const projectData = {
                            name: project.name,
                            client: project.client,
                            description: project.description || '',
                            latitude: project.latitude || '',
                            longitude: project.longitude || '',
                            images: project.images || 0, // Número de imágenes
                            hotspots: project.hotspots || 0 // Número de hotspots
                        };
                        addProjectCard(projectData);
                        updateNoProjectsMessage();
                    });
                }
            })
            .catch(error => {
                console.error('Error:', error);
                notyf.error('Erro ao carregar projetos. Tente novamente.');
            });
    }
    
    
    const menuItems = document.querySelectorAll('.menu li');

menuItems.forEach(item => {
    item.addEventListener('mouseenter', () => {
        // Quitar la clase "active" del elemento actual
        const currentActive = document.querySelector('.menu li.active');
        if (currentActive) {
            currentActive.classList.remove('active');
        }

        // Añadir la clase "active" al elemento sobre el que se pasa el mouse
        item.classList.add('active');
    });

    item.addEventListener('mouseleave', () => {
        const firstItem = document.querySelector('.menu li:first-child');
        if (item !== firstItem) {
            // Eliminar la clase "active" del elemento que ya no tiene el mouse
            item.classList.remove('active');
        }

        // Asegurar que el primer elemento mantenga la clase "active"
        if (firstItem && !document.querySelector('.menu li.active')) {
            firstItem.classList.add('active');
        }
    });
});


    // Cargar los proyectos al inicio
    fetchProjects();

    function updateNoProjectsMessage() {
        const projectsContainer = document.getElementById('projects-container');
        const noProjectsMessage = document.getElementById('no-projects-message');
    
        // Verificar si hay proyectos (excluyendo el mensaje mismo)
        const hasProjects = Array.from(projectsContainer.children).some(
            child => child !== noProjectsMessage
        );
    
        if (hasProjects) {
            noProjectsMessage.style.display = 'none'; // Ocultar mensaje
        } else {
            noProjectsMessage.style.display = 'block'; // Mostrar mensaje
        }
    }
    
});

