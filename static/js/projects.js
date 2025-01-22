document.addEventListener('DOMContentLoaded', () => {
    const createProjectButton = document.getElementById('create-project');
    const projectsContainer = document.getElementById('projects-container');

    createProjectButton.addEventListener('click', () => {
        const projectName = prompt('Insira o nome do projeto:');
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
                    notyf.error('O projeto já existe ou houve um erro.');
                }
            })
            .catch(error => {
                console.error('Erro:', error);
                notyf.error('Houve um erro ao criar o projeto.');
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
            if (confirm('Tem certeza de que deseja excluir este projeto?')) {
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
                notyf.error('Houve um erro ao excluir o projeto.');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            notyf.error('Houve um erro ao excluir o projeto.');
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
