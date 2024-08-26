document.addEventListener('DOMContentLoaded', () => {
    const createProjectButton = document.getElementById('create-project');
    const projectsContainer = document.getElementById('projects-container');

    createProjectButton.addEventListener('click', () => {
        const projectName = prompt('Introduce el nombre del proyecto:');
        if (projectName) {
            fetch('/api/create-project', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: projectName })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    addProjectThumbnail(projectName);
                } else {
                    notyf.error('El proyecto ya existe o hubo un error.');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                notyf.error('Hubo un error al crear el proyecto.');
            });
        }
    });

    function addProjectThumbnail(projectName) {
        const projectWrapper = document.createElement('div');
        projectWrapper.classList.add('project-wrapper');
        
        const projectThumbnail = document.createElement('div');
        projectThumbnail.classList.add('project-thumbnail');
        projectThumbnail.textContent = projectName;

        const deleteButton = document.createElement('button');
        deleteButton.innerHTML = '✖';
        deleteButton.classList.add('delete-button');
        deleteButton.addEventListener('click', function(event) {
            event.stopPropagation();
            if (confirm('¿Estás seguro de que deseas eliminar este proyecto?')) {
                deleteProject(projectName, projectWrapper);
            }
        });

        projectThumbnail.appendChild(deleteButton);

        projectThumbnail.addEventListener('click', () => {
            window.location.href = `/project/${projectName}`;
        });

        projectWrapper.appendChild(projectThumbnail);
        projectsContainer.appendChild(projectWrapper);
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
            } else {
                notyf.error('Hubo un error al eliminar el proyecto.');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            notyf.error('Hubo un error al eliminar el proyecto.');
        });
    }

    fetchProjects();

    function fetchProjects() {
        fetch('/api/projects')
        .then(response => response.json())
        .then(projects => {
            projects.forEach(project => {
                addProjectThumbnail(project.name);
            });
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }
});
