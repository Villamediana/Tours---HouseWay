let uploadedImages = [];
const notyf = new Notyf();
document.addEventListener('DOMContentLoaded', () => {
    const validExtensions = ['image/jpeg', 'image/png'];
    let currentImageUrl = null; // Variable para almacenar la URL de la imagen actual
    const initialPosition = { x: 0, y: 0 };  // Posición inicial (mirando hacia el frente)
    const thumbnailContainer = document.getElementById('thumbnail-container');
    let thumbnailIdCounter = 0;

    document.getElementById('uploadImage').addEventListener('change', function(event) {
        const file = event.target.files[0];
        
        if (file) {
            if (!validExtensions.includes(file.type)) {
                alert('Por favor, selecciona un archivo de imagen válido (.jpg, .png).');

                notyf.open({
                    type: 'info', // Tipo personalizado
                    message: 'Por favor, selecciona un archivo de imagen válido (.jpg, .png).',
                    duration: 4000, // Duración en milisegundos
                    background: '#F3C959', // Color personalizado
                    dismissible: true // Permite cerrar la notificación manualmente
                  });
               
                event.target.value = '';
                return;
            }
    
            const img = new Image();
            img.onload = function() {
                if (img.width / img.height === 2) {
                    const imageUrl = URL.createObjectURL(file);
                    addThumbnail(imageUrl, event.target);
                    addPanorama(imageUrl);
                    uploadedImages.push(file);  // Almacenar la imagen en el array
                    document.getElementById('placeholder-text').style.display = 'none';
    
                    toggleSearchBar();
                } else {
                    notyf.open({
                        type: 'info', // Tipo personalizado
                        message: 'Por favor, selecciona una imagen 360° con proporción 2:1.',
                        duration: 4000, // Duración en milisegundos
                        background: '#F3C959', // Color personalizado
                        dismissible: true // Permite cerrar la notificación manualmente
                      });
                    event.target.value = '';
                }
            };
    
            img.src = URL.createObjectURL(file);
        }
    });

    function addThumbnail(imageUrl, inputElement) {
        const thumbnailWrapper = document.createElement('div');
        thumbnailWrapper.classList.add('thumbnail-wrapper');
        thumbnailWrapper.id = 'thumbnail-' + thumbnailIdCounter++;
    
        const imgThumbnail = document.createElement('img');
        imgThumbnail.src = imageUrl;
        imgThumbnail.classList.add('thumbnail');
        imgThumbnail.addEventListener('click', function() {
            addPanorama(imageUrl);
        });
    
        const actionButtons = document.createElement('div');
        actionButtons.classList.add('action-buttons');
    
        const deleteButton = document.createElement('button');
        deleteButton.innerHTML = '✖';
        deleteButton.addEventListener('click', function(event) {
            event.stopPropagation(); // Prevenir que se cargue la imagen en el visualizador
            const index = Array.from(thumbnailWrapper.parentNode.children).indexOf(thumbnailWrapper);
            
            uploadedImages.splice(index, 1); // Eliminar la imagen del array uploadedImages
            thumbnailWrapper.remove(); // Eliminar la miniatura del DOM
            
            updateOrderNumbers(); // Actualizar los números de orden
            checkEmptyThumbnails(); // Verificar si quedan miniaturas
        });
    
        actionButtons.appendChild(deleteButton);
    
        const detailsContainer = document.createElement('div');
        detailsContainer.classList.add('thumbnail-details');
    
        const orderNumber = document.createElement('span');
        orderNumber.classList.add('order-number');
        orderNumber.textContent = thumbnailContainer.children.length + 1;
    
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = 'Ambiente';
        nameInput.classList.add('name-input');
        nameInput.maxLength = 12;
    
        detailsContainer.appendChild(orderNumber);
        detailsContainer.appendChild(nameInput);
    
        thumbnailWrapper.appendChild(imgThumbnail);
        thumbnailWrapper.appendChild(actionButtons);
        thumbnailWrapper.appendChild(detailsContainer);
    
        thumbnailContainer.appendChild(thumbnailWrapper);
    
        toggleSearchBar();
    }
    
    function resetViewer() {
        if (viewer.panorama) {
            viewer.remove(viewer.panorama);
            viewer.panorama.dispose();
            viewer.panorama = null;
        }
        
        currentImageUrl = null; // Restablecer la imagen actual
        
        document.getElementById('placeholder-text').style.display = 'block'; // Mostrar el texto de placeholder
    }
    
    
    function updateOrderNumbers() {
        const wrappers = document.querySelectorAll('.thumbnail-wrapper .order-number');
        let newOrder = [];
    
        wrappers.forEach((orderNumber, index) => {
            orderNumber.textContent = index + 1;
            const nameInput = wrappers[index].closest('.thumbnail-wrapper').querySelector('.name-input').value;
            newOrder.push(nameInput || `Ambiente ${index + 1}`);
        });
    }
   
    /*
    // Configuración de SortableJS para manejar el drag and drop
    new Sortable(thumbnailContainer, {
        animation: 150,
        onEnd: function (evt) {
            updateOrderNumbers(); // Actualizar números después de reordenar
        },
    });*/

    function checkEmptyThumbnails() {
        if (document.getElementById('thumbnail-container').children.length === 0) {
            document.getElementById('placeholder-text').style.display = 'block'; // Mostrar el texto de placeholder
            resetViewer(); // Restablecer el visualizador
            toggleSearchBar(); // Ocultar la barra de búsqueda si no hay miniaturas
        }
    }
    

    function addPanorama(imageUrl) {
        const panorama = new PANOLENS.ImagePanorama(imageUrl);
            
        viewer.add(panorama);
        viewer.setPanorama(panorama);
    
        currentImageUrl = imageUrl; // Actualizar la imagen actual
    }
    

    const viewer = new PANOLENS.Viewer({
        container: document.getElementById('viewer'),
        controlBar: true,
        controlButtons: ["fullscreen", "setting"],
        autoHideControlBar: false,
        superSample: true
    });

    // Configuración de SortableJS para manejar el drag and drop
    /*new Sortable(thumbnailContainer, {
        animation: 150,
        onEnd: function (evt) {
            updateOrderNumbers(); // Actualizar números después de reordenar
        },
    });*/
});

const menuItems = document.querySelectorAll('#menu ul li');

menuItems.forEach((item, index) => {
    item.addEventListener('click', () => {
        // Ignorar clics en elementos deshabilitados
        if (item.classList.contains('disabled')) {
            return;
        }

        menuItems.forEach((el, idx) => {
            if (idx < index) {
                el.classList.remove('active', 'disabled');
                el.classList.add('completed');  // Mantener como completado
            } else if (idx === index) {
                el.classList.add('active');
                el.classList.remove('completed', 'disabled');  // Hacer activo, eliminar cualquier clase previa
            } else if (idx === index + 1) {
                el.classList.remove('active', 'disabled');  // Mantener el siguiente paso habilitado
            } else {
                el.classList.remove('active', 'completed');
                el.classList.add('disabled');  // Desactivar los pasos que están después del siguiente
            }
        });
    });
});

document.getElementById('searchBar').addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    const thumbnails = document.querySelectorAll('.thumbnail-wrapper');

    thumbnails.forEach(thumbnail => {
        const nameInput = thumbnail.querySelector('.name-input').value.toLowerCase();
        if (nameInput.includes(searchTerm)) {
            thumbnail.style.display = ''; // Mostrar miniatura
        } else {
            thumbnail.style.display = 'none'; // Ocultar miniatura
        }
    });
});

function toggleSearchBar() {
    const searchBar = document.getElementById('searchBar');
    const thumbnails = document.querySelectorAll('.thumbnail-wrapper');
    
    if (thumbnails.length > 0) {
        searchBar.disabled = false; // Activar la barra de búsqueda
    } else {
        searchBar.disabled = true; // Desactivar la barra de búsqueda
    }
}

document.getElementById('save').addEventListener('click', function() {
    const formData = new FormData();
    const projectNameElement = document.getElementById('project-name');
    const projectName = projectNameElement.textContent.trim();
    const folderName = `${projectName}`;
    formData.append('folderName', folderName);

    const imagesData = getImagesData();
    formData.append('imagesData', JSON.stringify(imagesData));

    uploadedImages.forEach(file => formData.append('image', file));

    fetch('/save-image', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            $.notify("Proyecto guardado exitosamente.", "success");
            projectNameElement.innerHTML = `<a href="${data.viewer_url}" target="_blank">${projectName}</a>`;
        } else {
            $.notify("Hubo un error al guardar el proyecto.", "error");
        }
    })
    .catch(error => {
        console.error('Error:', error);
        $.notify("Hubo un error al guardar el proyecto.", "error");
    });
});



function getImagesData() {
    const imagesData = [];
    const thumbnails = document.querySelectorAll('.thumbnail-wrapper');

    thumbnails.forEach((thumbnail, index) => {
        const name = thumbnail.querySelector('.name-input').value;
        const imagePath = thumbnail.querySelector('img').src;        
        imagesData.push({
            order: index + 1, // El índice actual representa el orden
            name: name,
            path: imagePath,
        });
    });

    return imagesData;
}
